import React, { useEffect, useState } from 'react';
import { tabMonogram, type BrowserTab } from '../../shared/browserTabs';

const TabFavicon: React.FC<{ tab: BrowserTab }> = ({ tab }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [tab.favIconUrl]);

  const showImage = Boolean(tab.favIconUrl) && !failed;

  if (showImage) {
    return (
      <img
        className="tab-favicon-image"
        src={tab.favIconUrl}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="tab-favicon-fallback" aria-hidden="true">
      {tabMonogram(tab.title, tab.location)}
    </span>
  );
};

export default TabFavicon;
