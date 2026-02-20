import { Download, BookOpen, Smartphone, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import HomeLayout from "@/layouts/home-layout"

const DownloadButton = ({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) => (
  <Button asChild variant="outline" className="h-auto p-4">
    <a 
      href={href}
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-3"
      aria-label={`Download ${title}`}
    >
      {icon}
      <Download className="h-4 w-4" />
      <span>{title}</span>
    </a>
  </Button>
)

export default function Home() {
  return (
    <HomeLayout searchValue={""}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-8 px-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Ornagai Dictionary
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
               English-Myanmar / Myanmar-English dictionary
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <DownloadButton
              href="https://app.box.com/s/pjl69rypw62fmjyg7mdxr9hna0l0y0ng"
              icon={<BookOpen className="h-4 w-4" />}
              title="Mac Dictionary"
            />
            <DownloadButton
              href="https://app.box.com/s/hgqiq6m284v4axpxj1zti1ivnh3obqsl"
              icon={<Smartphone className="h-4 w-4" />}
              title="Kindle Dictionary"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Desktop (Offline)
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <DownloadButton
                href="https://app.box.com/s/q1sp3jlk1w5iyvnp19heuv12a4ept9d2"
                icon={<Monitor className="h-4 w-4" />}
                title="Windows"
              />
              <DownloadButton
                href="https://app.box.com/s/drlkdlqonyg5b2qmaslzw8a8nclxv1jg"
                icon={<Monitor className="h-4 w-4" />}
                title="Mac"
              />
              <DownloadButton
                href="https://app.box.com/s/yst1b6ofwuo285njpql9yba4cg0p6yy3"
                icon={<Monitor className="h-4 w-4" />}
                title="Linux (DEB) AMD64"
              />
              <DownloadButton
                href="https://app.box.com/s/tznfqangt3p3j1i46n5uccformhcbgun"
                icon={<Monitor className="h-4 w-4" />}
                title="Linux (DEB) ARM64"
              />
            </div>
          </div>

        </div>
      </div>
    </HomeLayout>
  )
}