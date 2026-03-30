import { useEffect, useRef } from 'react';

interface AdBannerProps {
  adKey: string;       // Adsterra'dan gelen benzersiz key
  width: number;
  height: number;
  className?: string;
}

export default function AdBanner({ adKey, width, height, className = '' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!containerRef.current || loaded.current) return;
    loaded.current = true;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = `//pl${adKey}.effectivecpmrevenue.com/${adKey}/invoke.js`;

    const options = document.createElement('script');
    options.type = 'text/javascript';
    options.innerHTML = `
      atOptions = {
        'key': '${adKey}',
        'format': 'iframe',
        'height': ${height},
        'width': ${width},
        'params': {}
      };
    `;

    containerRef.current.appendChild(options);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      loaded.current = false;
    };
  }, [adKey]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, minHeight: height, overflow: 'hidden' }}
    />
  );
}
