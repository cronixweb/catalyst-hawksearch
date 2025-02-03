import { useTranslations } from 'next-intl';

import { Slideshow as SlideshowSection } from '~/vibes/soul/sections/slideshow';

import SlideBg01 from './bsdslider1.png';

export function Slideshow() {
  const t = useTranslations('Home.Slideshow');

  const slides = [
    {
      title: 'HawkSearch Demo',
      image: {
        src: SlideBg01.src,
        alt: 'An image of an employee working with multimeter',
        blurDataUrl: SlideBg01.blurDataURL,
      },
      description: 'This demo site shows off the BigCommerce Catalyst frontend connected to a HawkSearch index.',
      cta: {
        href: '/shop-all',
        label: t('Slide01.cta'),
      },
    }
  ];

  return <SlideshowSection slides={slides} />;
}
