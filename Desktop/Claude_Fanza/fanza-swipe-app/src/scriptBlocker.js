// 広告トラッキングスクリプトをブロックする
class ScriptBlocker {
  constructor() {
    this.blockedDomains = [
      'ads.stickyadstv.com',
      'stickyadstv.com',
      'googleads.g.doubleclick.net',
      'doubleclick.net',
      'cm.g.doubleclick.net',
      'www.googleadservices.com',
      'pagead2.googlesyndication.com',
      'tpc.googlesyndication.com',
      'amazon-adsystem.com',
      'facebook.com/tr',
      'google-analytics.com',
      'googletagmanager.com',
      'adsystem.com',
      'adsrvr.org',
      'adnxs.com',
      'adsymptotic.com',
      'advertising.com',
      'adskeeper.com',
      'adsco.re',
      'criteo.com',
      'criteo.net',
      'outbrain.com',
      'taboola.com',
      'scorecardresearch.com',
      'quantserve.com',
      'adsafeprotected.com',
      'moatads.com',
      'contextweb.com',
      'openx.net',
      'pubmatic.com',
      'rubiconproject.com',
      'yahoo.com/pixel',
      'pixel',
      'analytics',
      'tracking'
    ];

    this.init();
  }

  init() {
    // ドキュメントの早い段階でブロックを開始
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startBlocking());
    } else {
      this.startBlocking();
    }

    // fetch APIをインターセプト（最優先）
    this.interceptFetch();

    // XMLHttpRequestをインターセプト（最優先）
    this.interceptXHR();

    // Imageオブジェクトもインターセプト
    this.interceptImage();
  }

  startBlocking() {
    // MutationObserverでDOMの変更を監視
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME' || node.tagName === 'IMG') {
                this.checkAndBlock(node);
              }
              // 子要素も再帰的にチェック
              if (node.querySelectorAll) {
                node.querySelectorAll('script, iframe, img').forEach(child => {
                  this.checkAndBlock(child);
                });
              }
            }
          });
        }
        if (mutation.type === 'attributes') {
          if (mutation.target.tagName === 'SCRIPT' || mutation.target.tagName === 'IFRAME' || mutation.target.tagName === 'IMG') {
            this.checkAndBlock(mutation.target);
          }
        }
      });
    });

    // 監視を開始
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href']
    });

    // 既存のスクリプトもチェック
    this.checkExistingScripts();
  }

  checkAndBlock(element) {
    const src = element.src || element.getAttribute('src');
    if (!src) return;

    const shouldBlock = this.blockedDomains.some(domain => 
      src.includes(domain)
    );

    if (shouldBlock) {
      if (import.meta.env.VITE_DEBUG_MODE === 'true') {
        console.log('Blocked script/iframe:', src);
      }
      element.remove();
    }
  }

  checkExistingScripts() {
    document.querySelectorAll('script, iframe, img').forEach(element => {
      this.checkAndBlock(element);
    });
  }

  interceptImage() {
    const OriginalImage = window.Image;
    window.Image = function() {
      const img = new OriginalImage();
      const originalSrc = Object.getOwnPropertyDescriptor(img.__proto__, 'src');
      
      Object.defineProperty(img, 'src', {
        set: function(value) {
          const shouldBlock = scriptBlocker.blockedDomains.some(domain => 
            value && value.toString().includes(domain)
          );
          
          if (shouldBlock) {
            if (import.meta.env.VITE_DEBUG_MODE === 'true') {
              console.log('Blocked image:', value);
            }
            return;
          }
          
          originalSrc.set.call(this, value);
        },
        get: function() {
          return originalSrc.get.call(this);
        }
      });
      
      return img;
    };
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const url = args[0];
      const shouldBlock = this.blockedDomains.some(domain => 
        url.includes(domain)
      );

      if (shouldBlock) {
        if (import.meta.env.VITE_DEBUG_MODE === 'true') {
          console.log('Blocked fetch:', url);
        }
        return Promise.reject(new Error('Blocked by script blocker'));
      }

      return originalFetch.apply(window, args);
    };
  }

  interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      const shouldBlock = this.blockedDomains.some(domain => 
        url.includes(domain)
      );

      if (shouldBlock) {
        if (import.meta.env.VITE_DEBUG_MODE === 'true') {
          console.log('Blocked XHR:', url);
        }
        throw new Error('Blocked by script blocker');
      }

      return originalOpen.apply(this, [method, url, ...rest]);
    };
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// シングルトンインスタンス
const scriptBlocker = new ScriptBlocker();

export default scriptBlocker;