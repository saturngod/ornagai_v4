# syntax=docker/dockerfile:1

# Bootstrap from a published image, then build the security release from source.
FROM php:8.5.11-fpm-bookworm AS php-build

ENV PHP_VERSION=8.5.12 \
    PHP_URL=https://www.php.net/distributions/php-8.5.12.tar.xz \
    PHP_ASC_URL=https://www.php.net/distributions/php-8.5.12.tar.xz.asc \
    PHP_SHA256=08bc2eba2a588654ade1357174aa646b761556c862dda0678345ee29ed481209

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        $PHPIZE_DEPS libargon2-dev libcurl4-openssl-dev libonig-dev \
        libreadline-dev libsodium-dev libsqlite3-dev libssl-dev libxml2-dev zlib1g-dev; \
    docker-php-source delete; \
    curl -fsSL --retry 3 "$PHP_URL" -o /usr/src/php.tar.xz; \
    echo "$PHP_SHA256  /usr/src/php.tar.xz" | sha256sum -c -; \
    docker-php-source extract; \
    cd /usr/src/php; \
    export CFLAGS="$PHP_CFLAGS" CPPFLAGS="$PHP_CPPFLAGS" LDFLAGS="$PHP_LDFLAGS"; \
    configureOptions="$(php-config --configure-options)"; \
    eval "./configure $configureOptions"; \
    make -j "$(nproc)"; \
    make install; \
    cd /; \
    docker-php-source delete; \
    php -r 'exit(PHP_VERSION === "8.5.12" ? 0 : 1);'; \
    php-fpm -v

FROM php:8.5.11-fpm-bookworm AS php-base

ENV PHP_VERSION=8.5.12 \
    PHP_URL=https://www.php.net/distributions/php-8.5.12.tar.xz \
    PHP_ASC_URL=https://www.php.net/distributions/php-8.5.12.tar.xz.asc \
    PHP_SHA256=08bc2eba2a588654ade1357174aa646b761556c862dda0678345ee29ed481209

COPY --from=php-build /usr/local/ /usr/local/
# Extension helpers must compile against the upgraded source, too.
COPY --from=php-build /usr/src/php.tar.xz /usr/src/php.tar.xz
RUN php -r 'exit(PHP_VERSION === "8.5.12" ? 0 : 1);' && php-fpm -t

FROM php-base AS vendor
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libicu-dev \
        libonig-dev \
        libxml2-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install \
        intl \
        mbstring \
        pdo_mysql \
        simplexml \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY . .
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative

FROM node:22-bookworm-slim AS assets
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=vendor /app/vendor ./vendor
COPY resources ./resources
COPY public ./public
COPY vite.config.ts tsconfig.json components.json ./
RUN npm run build

FROM php-base AS runtime

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        libicu-dev \
        libonig-dev \
        libxml2-dev \
        libzip-dev \
        nginx \
        supervisor \
        unzip \
    && docker-php-ext-install \
        intl \
        mbstring \
        pdo_mysql \
        simplexml \
        zip \
    && rm -f /etc/nginx/sites-enabled/default \
    && mkdir -p /run/nginx /var/log/supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/php/production.ini /usr/local/etc/php/conf.d/production.ini
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

COPY --from=vendor --chown=www-data:www-data /app /var/www/html
COPY --from=assets --chown=www-data:www-data /app/public/build /var/www/html/public/build

RUN mkdir -p \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1/up || exit 1

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
