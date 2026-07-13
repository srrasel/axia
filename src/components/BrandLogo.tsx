import clsx from 'clsx'
import { useApp } from '../context/AppContext'
import logo from '../assets/logo.png'
import logoWhite from '../assets/logo-white.png'

type BrandLogoProps = {
  className?: string
  /** Force a variant instead of following theme */
  variant?: 'auto' | 'light' | 'dark'
  alt?: string
}

/** NitajFX mark — `logo.png` in light mode, `logo-white.png` in dark mode. */
export function BrandLogo({ className, variant = 'auto', alt = 'NitajFX' }: BrandLogoProps) {
  const { darkMode } = useApp()
  const useWhite = variant === 'dark' || (variant === 'auto' && darkMode)
  return (
    <img
      src={useWhite ? logoWhite : logo}
      alt={alt}
      className={clsx('h-8 w-auto object-contain', className)}
      draggable={false}
    />
  )
}
