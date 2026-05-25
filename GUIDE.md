# Dokploy Docker Deployment Guide

This guide is for deploying Ornagai to Dokploy with Docker, PHP 8.4, MySQL, and the production domain:

```text
https://www.ornagai.com
```

The repository includes a production `Dockerfile` for the Laravel/React app. A `docker-compose.yml` is not required for the main Dokploy path because the app should be deployed as a Dokploy App and MySQL should be created as a separate Dokploy database/service.

## Target Setup

- Dokploy project: `Ornagai`
- Dokploy app: `ornagai-web`
- Public domain: `www.ornagai.com`
- Runtime: PHP 8.4
- Database: MySQL in Docker, managed by Dokploy or by a Docker Compose service
- Public traffic: only the web app should receive public HTTP/HTTPS traffic
- MySQL access: keep private; update/import data by SSH into the server and `docker exec` into the MySQL container

Recommended Dokploy layout:

```text
Dokploy Project
|-- App: ornagai-web
|   `-- Docker image for Laravel + built React assets
`-- MySQL database/service
    `-- Persistent Docker volume for /var/lib/mysql
```

## 1. DNS Before Dokploy Domain Setup

Before adding the domain in Dokploy, point DNS to the Dokploy server.

For `www.ornagai.com`, use one of these DNS options:

```text
Type: A
Name: www
Value: <DOKPLOY_SERVER_PUBLIC_IP>
TTL: Auto or 300
```

or, if `ornagai.com` already has an `A` record pointing to the server:

```text
Type: CNAME
Name: www
Value: ornagai.com
TTL: Auto or 300
```

Optional root domain setup:

```text
Type: A
Name: @
Value: <DOKPLOY_SERVER_PUBLIC_IP>
```

Only add the root domain if you also want `https://ornagai.com` to work or redirect to `https://www.ornagai.com`.

If using Cloudflare, start with DNS-only mode until the first Let's Encrypt certificate is issued. After SSL works, proxy mode can be enabled if desired.

## 2. Dokploy App Setup

Use this path when you create the web application:

```text
Dokploy > Project > Create App
```

Recommended app settings:

```text
Name: ornagai-web
Source: Git repository
Build type: Dockerfile
Dockerfile path: Dockerfile
Context directory: .
Internal app port: 80
Health check path: /up
```

The `/up` health route already exists in this Laravel app through `bootstrap/app.php`:

```php
health: '/up',
```

Do not add a duplicate `/up` route in `routes/web.php`; Laravel registers this health endpoint during application bootstrap. The Docker image also includes a container `HEALTHCHECK` that calls `http://127.0.0.1/up`.

## 3. Production Environment Variables

Do not bake `.env` into the Docker image. The `Dockerfile` builds application code only; production secrets and database settings must be injected by Dokploy as runtime environment variables.

Set these in:

```text
Dokploy > Project > App > ornagai-web > Environment
```

You can use `.env.dokploy.example` as a copy/paste template for Dokploy.

```dotenv
APP_NAME=Ornagai
APP_ENV=production
APP_KEY=base64:REPLACE_WITH_GENERATED_KEY
APP_DEBUG=false
APP_URL=https://www.ornagai.com

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

LOG_CHANNEL=stderr
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=<mysql-service-hostname>
DB_PORT=3306
DB_DATABASE=ornagai
DB_USERNAME=ornagai
DB_PASSWORD=<strong-password>

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=null

QUEUE_CONNECTION=database
CACHE_STORE=database
FILESYSTEM_DISK=local

MAIL_MAILER=log
MAIL_FROM_ADDRESS=hello@ornagai.com
MAIL_FROM_NAME="${APP_NAME}"

VITE_APP_NAME="${APP_NAME}"
```

Important:

- Generate `APP_KEY` once and keep it. Do not regenerate it on every deploy.
- `APP_URL` must be `https://www.ornagai.com` before production traffic starts.
- `DB_HOST` depends on the Dokploy MySQL service name or Docker Compose service name.
- Do not expose MySQL publicly unless there is a specific reason. Use SSH for database imports and maintenance.
- `.env`, `.env.production`, and other local env files are ignored by `.dockerignore` so they do not leak into the Docker image.

Generate an app key locally or inside a temporary app container:

```bash
php artisan key:generate --show
```

Copy the output into Dokploy as `APP_KEY`.

## 4. Recommended Dockerfile Shape

The included `Dockerfile` builds the app in three stages:

- Composer installs optimized PHP production dependencies.
- Node builds the Vite frontend assets.
- PHP 8.4-FPM runs Laravel.
- Nginx serves public files from `public/` and forwards PHP requests to PHP-FPM.
- Supervisor keeps Nginx and PHP-FPM running inside the single Dokploy app container.

Dokploy should build this file directly from Git:

```text
Dockerfile path: Dockerfile
Container port: 80
```

Supporting Docker config is in:

```text
docker/nginx/default.conf
docker/php/production.ini
docker/supervisor/supervisord.conf
```

The included `.dockerignore` keeps local `.env`, `vendor`, `node_modules`, logs, tests, and generated dictionary objects out of the Docker build context.

The Composer build stage uses `php:8.4-cli` and installs required PHP extensions before running `composer install`, including:

```text
intl
mbstring
pdo_mysql
simplexml
zip
```

At runtime, Laravel reads database settings from the environment:

```dotenv
DB_CONNECTION=mysql
DB_HOST=<mysql-service-hostname>
DB_PORT=3306
DB_DATABASE=ornagai
DB_USERNAME=ornagai
DB_PASSWORD=<strong-password>
```

So there is no `DB_HOST` or password inside the `Dockerfile`.

## 5. MySQL Setup

Preferred Dokploy setup:

```text
Dokploy > Project > Create Database/Service > MySQL
```

Use:

```text
Database: ornagai
User: ornagai
Password: strong generated password
Root password: strong generated password
Storage: persistent volume enabled
```

Then set the app's database environment variables to match.

If Dokploy gives the MySQL service an internal hostname, use that hostname as `DB_HOST`. If using Docker Compose, the app can usually use the service name:

```dotenv
DB_HOST=mysql
```

## 6. First Deploy Checklist

1. Push the Dockerfile and app code to Git.
2. Create the Dokploy project.
3. Create the MySQL service with persistent storage.
4. Create the Dokploy app from the Git repository.
5. Add all production environment variables.
6. Deploy the app.
7. Open the app terminal or SSH into the server and run:

```bash
php artisan migrate --force
php artisan optimize
```

8. Import the dictionary data into MySQL.
9. Add the domain in Dokploy.
10. Verify `https://www.ornagai.com/up`.
11. Verify `https://www.ornagai.com`.

## 7. Domain Setup Point in Dokploy

Do this after DNS points to the Dokploy server and the app is deploying successfully.

Path:

```text
Dokploy > Project > App > ornagai-web > Domains > Add Domain
```

Use:

```text
Host: www.ornagai.com
Path: /
Container port: 80
HTTPS: enabled
Certificate: Let's Encrypt
```

After adding the domain:

1. Save the domain.
2. For Dokploy Apps, domain changes should apply without redeploying. Redeploy only if you also changed the container port or app configuration.
3. Wait for the certificate to be issued.
4. Test:

```bash
curl -I https://www.ornagai.com/up
curl -I https://www.ornagai.com
```

Expected result:

```text
HTTP/2 200
```

If HTTPS works but Laravel generates `http://` links, confirm:

```dotenv
APP_URL=https://www.ornagai.com
SESSION_SECURE_COOKIE=true
```

Then run:

```bash
php artisan optimize:clear
php artisan optimize
```

## 8. Updating MySQL Data Later Over SSH

SSH into the Dokploy server:

```bash
ssh <server-user>@<server-ip>
```

Find the MySQL container:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

Open an interactive MySQL shell:

```bash
docker exec -it <mysql-container-name> mysql -u ornagai -p ornagai
```

Backup before importing new data:

```bash
docker exec <mysql-container-name> sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > /tmp/ornagai-backup.sql
```

Copy a SQL dump to the server:

```bash
scp ./ornagai.sql <server-user>@<server-ip>:/tmp/ornagai.sql
```

Import it into the MySQL container:

```bash
docker exec -i <mysql-container-name> sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < /tmp/ornagai.sql
```

For a compressed dump:

```bash
gzip -dc /tmp/ornagai.sql.gz | docker exec -i <mysql-container-name> sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

After importing data, clear Laravel caches if the app has stale results:

```bash
docker exec -it <app-container-name> php artisan optimize:clear
docker exec -it <app-container-name> php artisan optimize
```

## 9. Docker Compose Alternative

Use this only if you decide to deploy the app and MySQL together as a Dokploy Docker Compose service instead of using `Project > App`. For the planned `Project > App` deployment, do not create a compose deployment; create the MySQL database/service separately in Dokploy.

Example compose shape:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      APP_NAME: Ornagai
      APP_ENV: production
      APP_KEY: ${APP_KEY}
      APP_DEBUG: "false"
      APP_URL: https://www.ornagai.com
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: 3306
      DB_DATABASE: ${DB_DATABASE}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      SESSION_DRIVER: database
      SESSION_SECURE_COOKIE: "true"
      QUEUE_CONNECTION: database
      CACHE_STORE: database
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - app_storage:/var/www/html/storage
    expose:
      - "80"

  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_USER: ${DB_USERNAME}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  app_storage:
  mysql_data:
```

For Docker Compose deployments, add the domain under the compose service's domain settings, not under `Project > App`:

```text
Dokploy > Project > Docker Compose > Domains
```

Use the web service and port `80`. MySQL should not receive a public domain.

## 10. Troubleshooting

If the domain does not resolve:

```bash
dig www.ornagai.com
```

Confirm the result points to the Dokploy server IP.

If SSL fails:

- Confirm DNS is already pointing to Dokploy.
- Confirm ports `80` and `443` are open on the server firewall.
- Temporarily disable Cloudflare proxy mode if using Cloudflare.
- Re-save the Dokploy domain and check the Traefik logs in Dokploy.

If the app shows a Laravel database error:

- Confirm `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
- Confirm the MySQL container is running.
- Confirm migrations ran with `php artisan migrate --force`.

If Vite assets are missing:

- Confirm `npm run build` runs during the Docker build.
- Confirm `public/build` exists in the final image.

If Docker build fails during `composer install`:

- Check the full Dokploy build log above the final error line.
- Most failures here are missing PHP extensions or network/package download failures.
- This Dockerfile installs the PHP extensions required by the current `composer.lock`; after changing Composer packages, rebuild and check the full log again.

If `/up` fails:

- Confirm the app container is running.
- Confirm Dokploy is routing to container port `80`.
- Check the Nginx and PHP-FPM logs in the Dokploy app logs.

If storage writes fail:

```bash
docker exec -it <app-container-name> chown -R www-data:www-data storage bootstrap/cache
```

## References

- Dokploy Domains: https://docs.dokploy.com/docs/core/domains
- Dokploy Applications: https://docs.dokploy.com/docs/core/applications
- Dokploy Docker Compose: https://docs.dokploy.com/docs/core/docker-compose
- Dokploy Docker Compose Domains: https://docs.dokploy.com/docs/core/docker-compose/domains
- Laravel deployment: https://laravel.com/docs/deployment
