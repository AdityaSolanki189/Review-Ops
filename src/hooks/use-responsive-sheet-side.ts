'use client'

import { useIsMobile } from '@/hooks/use-mobile'

export function useResponsiveSheetSide(): 'bottom' | 'right' {
    const isMobile = useIsMobile()
    return isMobile ? 'bottom' : 'right'
}
