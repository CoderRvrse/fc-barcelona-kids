/**
 * Share Module for Formation Lab
 * Handles social media sharing and share menu toggling
 */

export function initShare() {
  const shareToggle = document.getElementById('btnShareToggle');
  const shareMenu = document.getElementById('shareMenu');
  const shareFacebook = document.getElementById('shareFacebook');
  const shareTwitter = document.getElementById('shareTwitter');
  const shareLinkedin = document.getElementById('shareLinkedin');
  const shareInstagram = document.getElementById('shareInstagram');
  const shareEmail = document.getElementById('shareEmail');
  const shareCopy = document.getElementById('shareCopy');
  const shareQR = document.getElementById('shareQR');

  if (!shareToggle) return;

  // Position and toggle share menu visibility
  shareToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = shareMenu.style.display !== 'none';

    if (!isVisible) {
      // Close the Tools panel
      const controlsTab = document.getElementById('btnControlsTab');
      const controlsSheet = document.getElementById('pitchControlsSheet');
      if (controlsSheet && controlsSheet.classList.contains('is-open')) {
        controlsTab.click();
      }

      // Position menu in center of viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      shareMenu.style.position = 'fixed';
      shareMenu.style.top = (vh / 2 - 60) + 'px'; // Center vertically
      shareMenu.style.left = (vw / 2 - 110) + 'px'; // Center horizontally
      shareMenu.style.display = 'grid';
      shareMenu.style.zIndex = '1000';

      // Show toast notification
      import('./ui-toast.js').then(({ showToast }) => {
        showToast('📤 Choose a platform to share your formation!', 'info');
      });
    } else {
      shareMenu.style.display = 'none';
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#btnShareToggle') && !e.target.closest('#shareMenu')) {
      shareMenu.style.display = 'none';
    }
  });

  const getShareUrl = () => window.location.href;
  const getShareText = () => 'Check out my soccer formation on Formation Lab! ⚽';

  // Facebook Share
  shareFacebook.addEventListener('click', (e) => {
    e.preventDefault();
    const url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(getShareUrl());
    window.open(url, 'facebook-share', 'width=600,height=400');
  });

  // Twitter Share
  shareTwitter.addEventListener('click', (e) => {
    e.preventDefault();
    const url = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(getShareUrl()) + '&text=' + encodeURIComponent(getShareText());
    window.open(url, 'twitter-share', 'width=600,height=400');
  });

  // LinkedIn Share
  shareLinkedin.addEventListener('click', (e) => {
    e.preventDefault();
    const url = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(getShareUrl());
    window.open(url, 'linkedin-share', 'width=600,height=400');
  });

  // Instagram
  shareInstagram.addEventListener('click', (e) => {
    e.preventDefault();
    copyToClipboard(getShareUrl(), 'Link copied! Share on Instagram');
  });

  // Email Share
  shareEmail.addEventListener('click', (e) => {
    e.preventDefault();
    const subject = 'Check out my soccer formation!';
    const body = getShareText() + '\n\n' + getShareUrl();
    window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });

  // Copy Link
  shareCopy.addEventListener('click', (e) => {
    e.preventDefault();
    copyToClipboard(getShareUrl(), '✓ Link copied!');
  });

  // QR Code
  shareQR.addEventListener('click', (e) => {
    e.preventDefault();
    copyToClipboard(getShareUrl(), '📱 QR code feature coming soon!');
  });

  function copyToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(() => {
      import('./ui-toast.js').then(({ showToast }) => {
        showToast(message, 'success');
      }).catch(() => {
        alert(message);
      });
      setTimeout(() => { shareMenu.style.display = 'none'; }, 500);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy link');
    });
  }
}
