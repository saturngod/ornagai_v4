import { Download, BookOpen, Smartphone, Monitor, Play } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import HomeLayout from "@/layouts/home-layout"

const AppCard = ({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/30 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200"
    aria-label={`Download ${title}`}
  >
    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      )}
    </div>
    <Download className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors flex-shrink-0" />
  </a>
)

const PlatformCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {icon}
        {title}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </CardContent>
  </Card>
)

const SmallDownloadLink = ({ href, title }: { href: string; title: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
  >
    <Download className="w-3.5 h-3.5 text-gray-400" />
    <span>{title}</span>
  </a>
)

export default function Home() {
  return (
    <HomeLayout searchValue={""}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-2xl mx-auto space-y-10 px-4 py-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Ornagai Dictionary
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              English-Myanmar / Myanmar-English dictionary
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AppCard
              href="https://app.box.com/s/pjl69rypw62fmjyg7mdxr9hna0l0y0ng"
              icon={<BookOpen className="w-5 h-5" />}
              title="Mac Dictionary"
              description="For Apple Books"
            />
            <AppCard
              href="https://app.box.com/s/hgqiq6m284v4axpxj1zti1ivnh3obqsl"
              icon={<Smartphone className="w-5 h-5" />}
              title="Kindle"
              description="e-Reader format"
            />
            <AppCard
              href="https://play.google.com/store/apps/details?id=com.comquas.ornagai"
              icon={<Play className="w-5 h-5" />}
              title="Android"
              description="Google Play Store"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Desktop (Offline)
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PlatformCard title="Windows" icon={<Monitor className="w-4 h-4" />}>
                <SmallDownloadLink
                  href="https://app.box.com/s/s0f6mnnsg3rjaadtfh0ep2qsbxoo90ci"
                  title="Windows Installer"
                />
              </PlatformCard>

              <PlatformCard title="macOS" icon={<Monitor className="w-4 h-4" />}>
                <SmallDownloadLink
                  href="https://app.box.com/s/gvclexkqlwbl19ss0965t79mswcd69hj"
                  title="macOS App"
                />
              </PlatformCard>

              <PlatformCard title="Linux" icon={<Monitor className="w-4 h-4" />}>
                <SmallDownloadLink
                  href="https://app.box.com/s/i4lgkpfhmtl2o2zeksdlglqtv3da544o"
                  title="DEB (AMD64)"
                />
                <SmallDownloadLink
                  href="https://app.box.com/s/nl8fkze3vgrkj4xe887x8120kodv4wbh"
                  title="AppImage (AMD64)"
                />
                <SmallDownloadLink
                  href="https://app.box.com/s/nru3rndrx1qf79rfz57ov6euorrftfes"
                  title="DEB (ARM64)"
                />
                <SmallDownloadLink
                  href="https://app.box.com/s/bu8yv9dr8iibp5cfou1omuivfz4k9mq0"
                  title="AppImage (ARM64)"
                />
              </PlatformCard>
            </div>
          </div>
        </div>
      </div>
    </HomeLayout>
  )
}