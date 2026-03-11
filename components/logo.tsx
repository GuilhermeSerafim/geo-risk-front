import Image from "next/image"

interface LogoProps {
  className?: string
  width?: number
  height?: number
  showText?: boolean
  textClassName?: string
}

export function Logo({ 
  className = "", 
  width = 48, 
  height = 48, 
  showText = true,
  textClassName = "text-sm font-semibold tracking-wide"
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo4.png"
        alt="GeoRisk Logo"
        width={width}
        height={height}
        className="object-contain dark:hidden"
        priority
      />
      <Image
        src="/logo3.png"
        alt="GeoRisk Logo (Dark Mode)"
        width={width}
        height={height}
        className="object-contain hidden dark:block"
        priority
      />
      {showText && <span className={textClassName}>GeoRisk</span>}
    </div>
  )
}
