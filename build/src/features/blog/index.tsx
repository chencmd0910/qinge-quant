import { useTranslation } from 'react-i18next'
import { PublicLayout } from '@/components/layout'

export function Blog() {
  const { t } = useTranslation()
  return (
    <PublicLayout showMainContainer={false}>
      <iframe
        src='/blog/index.html'
        className='h-[calc(100vh-3.5rem)] w-full border-0'
        title={t('Blog')}
      />
    </PublicLayout>
  )
}
