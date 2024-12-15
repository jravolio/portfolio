import Link from 'next/link'
import { useTranslation } from '../i18n'
import { Footer } from './components/Footer'

export default async function Page({ params: { lng } }: { params: { lng: any } }) {
  const { t } = await useTranslation(lng, 'translation')
  return (
    <>
      <h1>{t('title')}</h1>
      <Link href={`/${lng}/second-page`}>
        {t('to-second-page')}
      </Link>
      <Footer lng={lng}/>
    </>
  )
}