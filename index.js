<!-- ================== SCRIPT ================== -->

document.addEventListener('DOMContentLoaded', function () {
  // ---------------- toBlob polyfill (one-time, guarded) ----------------
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (callback, type, quality) {
        const bin = atob(this.toDataURL(type, quality).split(',')[1]);
        const len = bin.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
        callback(new Blob([arr], { type: type || 'image/png' }));
      }
    });
  }

  // --------------- Small helpers ---------------
  function setAllImgSrc(rootEl, selector, dataUrl) {
    rootEl.querySelectorAll(selector).forEach((img) => {
      img.crossOrigin = 'anonymous';
      img.src = dataUrl || '';
    });
  }
  function setAllImgSrcByClass(rootEl, className, dataUrl) {
    Array.from(rootEl.getElementsByClassName(className)).forEach((img) => {
      img.crossOrigin = 'anonymous';
      img.src = dataUrl || '';
    });
  }

  function insertSoftNewline(inputEl, e) {
    if (e.key === 'Enter') {
      const pos = inputEl.selectionStart;
      inputEl.value = inputEl.value.slice(0, pos) + '\n' + inputEl.value.slice(0 + pos);
      e.preventDefault();
      inputEl.dispatchEvent(new Event('input'));
    }
  }

  function gateDownloadBtn(btn, enabled) {
    if (!btn) return;
    if (enabled) btn.classList.remove('inactive');
    else btn.classList.add('inactive');
  }

  // Escape HTML before we inject to innerHTML
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (m) {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default:  return m;
      }
    });
  }

  // Format heading with bracket-to-accent and newline handling
  function formatHeadingFromInput(valueOrDefault) {
    let safe = escapeHtml(valueOrDefault);
    safe = safe.replace(/\n/g, '<br>');
    safe = safe.replace(/\[([^\]]+)\]/g, '<span class="accent">$1</span>');
    return safe;
  }

  // Utility: write HTML into multiple possible selectors (supports fallbacks)
  function writeHtmlIntoTargets(root, selectorList, html) {
    const nodes = [];
    selectorList.forEach(sel => {
      root.querySelectorAll(sel).forEach(n => nodes.push(n));
    });
    nodes.forEach(n => n.innerHTML = html);
    return nodes.length;
  }

  // Utility: set style on multiple possible selectors
  function setStyleOnTargets(root, selectorList, prop, val) {
    selectorList.forEach(sel => {
      root.querySelectorAll(sel).forEach(n => n.style[prop] = val);
    });
  }

  // Utility: get nodes for measuring (first matching selector that exists)
  function getMeasureNodes(root, selectorList) {
    for (const sel of selectorList) {
      const list = root.querySelectorAll(sel);
      if (list.length) return list;
    }
    return [];
  }

  /* ================== SLIDE 1 (Card 1) ================== */
  (function () {
    const defaultHeadingSize1 = 83.66;
    const minSize             = 10;
    const maxLines            = 3;
    const lineHeightRatio     = 0.8;

    const mugshotInput           = document.getElementById('mugshot');
    const dragDropArea           = document.getElementById('drag-drop-area');
    const fileChosenText         = document.getElementById('file-chosen');
    const cropperModal           = document.getElementById('cropper-modal');
    const cropperImage           = document.getElementById('cropper-image');
    const saveCroppedImageButton = document.getElementById('save-cropped-image');
    const editImageButton        = document.getElementById('edit-image-button');
    const deleteImageButton      = document.getElementById('delete-image-button');

    const headingInput         = document.getElementById('01-heading');
    const contentInputPrimary  = document.getElementById('01-content');
    const contentInputSecond   = document.getElementById('01-content-2');

    const headingFieldsSel     = '.design-heading';
    const contentFieldsSel     = '.design-content';
    const contentFieldsSel2    = '.design-content-2';

    const mugshotPreviewSel    = '.id-card-mugshot';

    const downloadButton       = document.getElementById('download');
    const downloadButtonText   = downloadButton?.querySelector('.button-text');

    const resultsDiv           = document.getElementById('id-card');
    const parentDiv            = document.querySelector('.preview_block');

    let cropper = null;
    let uploadedImageData = null;
    const downloadCounts = {};

    if (fileChosenText) fileChosenText.style.display = 'none';
    if (editImageButton)   editImageButton.style.display   = 'none';
    if (deleteImageButton) deleteImageButton.style.display = 'none';

    function handleImageFile(file) {
      if (!file || !/image\/(png|jpeg|jpg|gif)/i.test(file.type)) {
        alert('Please upload a valid image file (PNG, JPEG, GIF).');
        return;
      }
      if (fileChosenText) {
        fileChosenText.textContent = file.name;
        fileChosenText.style.display = 'block';
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImageData = e.target.result;
        if (!cropperImage || !cropperModal) return;

        cropperImage.src = uploadedImageData;
        cropperImage.crossOrigin = 'anonymous';
        cropperModal.style.display = 'block';
        cropper = new Cropper(cropperImage, { aspectRatio: 1, viewMode: 2 });

        if (editImageButton)   editImageButton.style.display   = 'inline-block';
        if (deleteImageButton) deleteImageButton.style.display = 'inline-block';
        updateDownloadButtonState();
      };
      reader.readAsDataURL(file);
    }

    if (mugshotInput) {
      mugshotInput.addEventListener('change', (e) => handleImageFile(e.target.files[0]));
    }
    if (dragDropArea) {
      dragDropArea.addEventListener('dragover', (e) => { e.preventDefault(); dragDropArea.classList.add('drag-over'); });
      dragDropArea.addEventListener('dragleave', (e) => { e.preventDefault(); dragDropArea.classList.remove('drag-over'); });
      dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('drag-over');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleImageFile(file);
      });
    }

    if (saveCroppedImageButton) {
      saveCroppedImageButton.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas();
        const png = canvas.toDataURL('image/png');
        setAllImgSrc(resultsDiv, mugshotPreviewSel, png);
        uploadedImageData = png;
        cropper.destroy();
        cropper = null;
        if (cropperModal) cropperModal.style.display = 'none';
        updateDownloadButtonState();
      });
    }

    if (editImageButton) {
      editImageButton.addEventListener('click', () => {
        if (!uploadedImageData || !cropperImage || !cropperModal) return;
        cropperImage.src = uploadedImageData;
        cropperImage.crossOrigin = 'anonymous';
        cropperModal.style.display = 'block';
        cropper = new Cropper(cropperImage, { aspectRatio: 1, viewMode: 2 });
      });
    }

    if (deleteImageButton) {
      deleteImageButton.addEventListener('click', () => {
        setAllImgSrc(resultsDiv, mugshotPreviewSel, '');
        uploadedImageData = null;
        if (fileChosenText) {
          fileChosenText.textContent = 'No file chosen';
          fileChosenText.style.display = 'none';
        }
        if (mugshotInput) mugshotInput.value = '';
        if (editImageButton)   editImageButton.style.display   = 'none';
        if (deleteImageButton) deleteImageButton.style.display = 'none';
        updateDownloadButtonState();
      });
    }

    // Card 1: binary-search shrink-to-fit
    function adjustFontSizeForHeadings() {
      resultsDiv.querySelectorAll(headingFieldsSel).forEach((field) => {
        field.style.fontSize = defaultHeadingSize1 + 'px';
        field.style.lineHeight = lineHeightRatio;

        const lines = Math.round(field.scrollHeight / (defaultHeadingSize1 * lineHeightRatio));
        if (lines > maxLines) {
          let low = minSize;
          let high = defaultHeadingSize1;
          let best = minSize;

          while (low <= high) {
            const mid = (low + high) / 2;
            field.style.fontSize = mid + 'px';
            const currLines = Math.round(field.scrollHeight / (mid * lineHeightRatio));
            if (currLines <= maxLines) {
              best = mid;
              low = mid + 0.1;
            } else {
              high = mid - 0.1;
            }
          }
          field.style.fontSize = best + 'px';
        }
      });
    }

    function adjustCoverWrapperHeight() {
      resultsDiv.querySelectorAll('.carousel-4-cover-header-wrapper').forEach((wrapper) => {
        wrapper.style.height = 'auto';
        wrapper.style.height = wrapper.scrollHeight + 'px';
      });
    }

    function missingFields1() {
      const missing = [];
      if (!uploadedImageData) missing.push('mugshot image');
      if (!headingInput || headingInput.value.trim() === '') missing.push('heading');
      if (!contentInputPrimary || contentInputPrimary.value.trim() === '') missing.push('content #1');
      if (!contentInputSecond || contentInputSecond.value.trim() === '') missing.push('content #2');
      return missing;
    }
    function isAllFilled1() { return missingFields1().length === 0; }

    function updateHeadingPlaceholder() {
      const defaultText = 'Seun Lanlege raised $5.6M for his project.';
      const val = (headingInput?.value || '').trim();
      const textForHtml = val === '' ? defaultText : headingInput.value;
      const html = formatHeadingFromInput(textForHtml);
      resultsDiv.querySelectorAll(headingFieldsSel).forEach((field) => {
        field.innerHTML = html;
        field.style.fontSize = (val === '' ? defaultHeadingSize1 + 'px' : field.style.fontSize);
      });
      if (val !== '') adjustFontSizeForHeadings();
      adjustCoverWrapperHeight();
      updateDownloadButtonState();
    }

    function renderPrimaryContent() {
      const def =
        'But 9 years ago, he was a dropout chasing an unconventional path to  success.';
      const raw  = (contentInputPrimary?.value || '');
      const html = (raw.trim() === '' ? def : raw).replace(/\n/g, '<br>');
      resultsDiv.querySelectorAll(contentFieldsSel).forEach((f) => (f.innerHTML = html));
      updateDownloadButtonState();
    }

    function renderSecondaryContent() {
      const def =
        'Here’s how his conviction pushed him to build the 3rd biggest bridge on Polkadot.';
      const raw  = (contentInputSecond?.value || '');
      const html = (raw.trim() === '' ? def : raw).replace(/\n/g, '<br>');
      resultsDiv.querySelectorAll(contentFieldsSel2).forEach((f) => (f.innerHTML = html));
      updateDownloadButtonState();
    }

    if (headingInput) {
      headingInput.addEventListener('input', updateHeadingPlaceholder);
      headingInput.addEventListener('keydown', (e) => insertSoftNewline(headingInput, e));
    }
    if (contentInputPrimary) {
      contentInputPrimary.addEventListener('input', renderPrimaryContent);
      contentInputPrimary.addEventListener('keydown', (e) => insertSoftNewline(contentInputPrimary, e));
    }
    if (contentInputSecond) {
      contentInputSecond.addEventListener('input', renderSecondaryContent);
      contentInputSecond.addEventListener('keydown', (e) => insertSoftNewline(contentInputSecond, e));
    }

    // initial render
    updateHeadingPlaceholder();
    renderPrimaryContent();
    renderSecondaryContent();

    function updateDownloadButtonState() {
      gateDownloadBtn(downloadButton, isAllFilled1());
    }

    function downloadAsPng1(ev) {
      if (!downloadButton || downloadButton.classList.contains('inactive')) {
        ev.preventDefault();
        alert('Please provide: ' + missingFields1().join(', ') + '.');
        return;
      }
      if (downloadButtonText) downloadButtonText.textContent = 'Downloading…';
      const orig = parentDiv ? parentDiv.style.display : '';
      if (parentDiv && window.innerWidth <= 1024) parentDiv.style.display = 'block';
      document.querySelectorAll('img').forEach((img) => (img.crossOrigin = 'anonymous'));

      html2canvas(resultsDiv, { backgroundColor: '#3B1A35', useCORS: true, scale: 4 })
        .then((canvas) => {
          canvas.toBlob((blob) => {
            const a = document.createElement('a');
            const base = (headingInput?.value.trim() || 'design');
            const n = (downloadCounts[base] = (downloadCounts[base] || 0) + 1);
            a.href = URL.createObjectURL(blob);
            a.download = `${base}${n > 1 ? '-' + n : ''}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
          }, 'image/png');
        })
        .catch((err) => {
          console.error(err);
          alert('Issue generating image.');
        })
        .finally(() => {
          if (parentDiv) parentDiv.style.display = orig;
          if (downloadButtonText) downloadButtonText.textContent = 'Download';
        });
    }

    if (downloadButton) downloadButton.addEventListener('click', downloadAsPng1);

    if (cropperModal) {
      cropperModal.addEventListener('click', (e) => {
        if (e.target === cropperModal && cropper) {
          cropper.destroy();
          cropper = null;
          cropperModal.style.display = 'none';
        }
      });
    }
    const closeCropperModalButton = document.getElementById('close-cropper-modal');
    if (closeCropperModalButton) {
      closeCropperModalButton.addEventListener('click', () => {
        if (cropper) {
          cropper.destroy();
          cropper = null;
        }
        if (cropperModal) cropperModal.style.display = 'none';
      });
    }

    window.addEventListener('resize', function () {
      if (headingInput && headingInput.value.trim()) adjustFontSizeForHeadings();
      adjustCoverWrapperHeight();
    });
  })();

  /* ================== SLIDE 2 (Card 2) ================== */
  (function () {
    const root2 = document.getElementById('id-card-2');

    const mugshotInput2           = document.getElementById('mugshot-2');
    const dragDropArea2           = document.getElementById('drag-drop-area-2');
    const fileChosenText2         = document.getElementById('file-chosen-2');
    const cropperModal2           = document.getElementById('cropper-modal-2');
    const cropperImage2           = document.getElementById('cropper-image-2');
    const saveCroppedImageButton2 = document.getElementById('save-cropped-image-2');
    const editImageButton2        = document.getElementById('edit-image-button-2');
    const deleteImageButton2      = document.getElementById('delete-image-button-2');

    const headingInput2   = document.getElementById('02-heading');
    const contentInput2   = document.getElementById('02-content');
    const contentInput2b  = document.getElementById('02-content-2');

    const headingFieldSelector2  = '.carousel-4-body-header_wrapper';
    const contentFieldSelector2  = '.design-content-body';
    const contentFieldSelector2b = '.design-content-body-2';
    const mugshotPreviewSel2     = '.id-card-mugshot-body';

    const defaultHeadingSize2 = 83.66;
    const minSize2            = 10;
    const maxLines2           = 3;
    const lineHeightRatio2    = 0.8;

    const downloadButton2     = document.getElementById('download-2');
    const downloadButtonText2 = downloadButton2?.querySelector('.button-text');

    const parentDiv2  = document.querySelector('.preview_block');

    let cropper2 = null;
    let uploadedImageData2 = null;
    const downloadCounts2 = {};

    if (fileChosenText2) fileChosenText2.style.display = 'none';
    if (editImageButton2)   editImageButton2.style.display   = 'none';
    if (deleteImageButton2) deleteImageButton2.style.display = 'none';

    const defaultImg2 = root2?.querySelector('.mugshot-2');
    if (defaultImg2) {
      defaultImg2.src = 'https://cdn.prod.website-files.com/678517a28eb2d34a4320905a/6785414deac53aed0c68c0b9_Placeholder%20IMG.png';
      defaultImg2.crossOrigin = 'anonymous';
    }

    function handleImageFile2(file) {
      if (!file || !/image\/(png|jpeg|jpg|gif)/i.test(file.type)) {
        alert('Please upload a valid image file (PNG, JPEG, GIF).');
        return;
      }
      if (fileChosenText2) {
        fileChosenText2.textContent = file.name;
        fileChosenText2.style.display = 'block';
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImageData2 = e.target.result;
        if (!cropperImage2 || !cropperModal2) return;
        cropperImage2.src = uploadedImageData2;
        cropperImage2.crossOrigin = 'anonymous';
        cropperModal2.style.display = 'block';
        /* 591x273 aspect ratio */
        cropper2 = new Cropper(cropperImage2, { aspectRatio: 591/273, viewMode: 2 });
        if (editImageButton2)   editImageButton2.style.display   = 'inline-block';
        if (deleteImageButton2) deleteImageButton2.style.display = 'inline-block';
        updateDownloadButtonState2();
      };
      reader.readAsDataURL(file);
    }

    if (mugshotInput2) mugshotInput2.addEventListener('change', (e) => handleImageFile2(e.target.files[0]));
    if (dragDropArea2) {
      dragDropArea2.addEventListener('dragover', (e) => { e.preventDefault(); dragDropArea2.classList.add('drag-over'); });
      dragDropArea2.addEventListener('dragleave', (e) => { e.preventDefault(); dragDropArea2.classList.remove('drag-over'); });
      dragDropArea2.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea2.classList.remove('drag-over');
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleImageFile2(f);
      });
    }

    if (saveCroppedImageButton2) {
      saveCroppedImageButton2.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!cropper2) return;
        const canvas = cropper2.getCroppedCanvas({
          width: 591,
          height: 273,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        const png = canvas.toDataURL('image/png');
        setAllImgSrc(root2, mugshotPreviewSel2, png);
        uploadedImageData2 = png;
        cropper2.destroy();
        cropper2 = null;
        if (cropperModal2) cropperModal2.style.display = 'none';
        updateDownloadButtonState2();
      });
    }

    if (editImageButton2) {
      editImageButton2.addEventListener('click', () => {
        if (!uploadedImageData2 || !cropperImage2 || !cropperModal2) return;
        cropperImage2.src = uploadedImageData2;
        cropperImage2.crossOrigin = 'anonymous';
        cropperModal2.style.display = 'block';
        cropper2 = new Cropper(cropperImage2, { aspectRatio: 591/273, viewMode: 2 });
      });
    }

    if (deleteImageButton2) {
      deleteImageButton2.addEventListener('click', () => {
        setAllImgSrc(root2, mugshotPreviewSel2, '');
        uploadedImageData2 = null;
        if (fileChosenText2) {
          fileChosenText2.textContent = 'No file chosen';
          fileChosenText2.style.display = 'none';
        }
        if (mugshotInput2) mugshotInput2.value = '';
        if (editImageButton2)   editImageButton2.style.display   = 'none';
        if (deleteImageButton2) deleteImageButton2.style.display = 'none';
        updateDownloadButtonState2();
      });
    }

    function adjustFontSizeForHeadings2() {
      root2.querySelectorAll(headingFieldSelector2).forEach((wrapper) => {
        wrapper.style.height = 'auto';
        wrapper.style.height = wrapper.scrollHeight + 'px';
      });
      root2.querySelectorAll(headingFieldSelector2).forEach((field) => {
        field.style.fontSize   = defaultHeadingSize2 + 'px';
        field.style.lineHeight = lineHeightRatio2;

        const lines = Math.round(field.scrollHeight / (defaultHeadingSize2 * lineHeightRatio2));
        if (lines > maxLines2) {
          let low  = minSize2;
          let high = defaultHeadingSize2;
          let best = minSize2;

          while (low <= high) {
            const mid = (low + high) / 2;
            field.style.fontSize = mid + 'px';
            const currLines = Math.round(field.scrollHeight / (mid * lineHeightRatio2));
            if (currLines <= maxLines2) {
              best = mid;
              low  = mid + 0.1;
            } else {
              high = mid - 0.1;
            }
          }
          field.style.fontSize = best + 'px';
        }
      });
    }

    function adjustBodyWrapperHeight2() {
      root2.querySelectorAll('.carousel-4-body-header_wrapper').forEach((wrapper) => {
        wrapper.style.height = 'auto';
        wrapper.style.height = wrapper.scrollHeight + 'px';
      });
    }

    function missingFields2() {
      const missing = [];
      if (!uploadedImageData2) missing.push('mugshot image');
      if (!headingInput2 || headingInput2.value.trim() === '') missing.push('heading');
      if (!contentInput2 || contentInput2.value.trim() === '') missing.push('content #1');
      if (!contentInput2b || contentInput2b.value.trim() === '') missing.push('content #2');
      return missing;
    }
    function isAllFilled2() { return missingFields2().length === 0; }

    function renderHeading2() {
      const raw = (headingInput2?.value || '').trim();
      const textForHtml = raw === ''
        ? 'In 2016, Seun dropped out of university.'
        : headingInput2.value;
      const html = formatHeadingFromInput(textForHtml);
      root2.querySelectorAll(headingFieldSelector2).forEach((field) => {
        field.innerHTML = html;
        field.style.fontSize = (raw === '' ? defaultHeadingSize2 + 'px' : field.style.fontSize);
      });
      if (raw !== '') adjustFontSizeForHeadings2();
      adjustBodyWrapperHeight2();
      updateDownloadButtonState2();
    }

    function renderBodyContent1_2() {
      const raw  = (contentInput2?.value || '');
      const html = (raw.trim() === ''
        ? 'It was an unconventional move, but he believed that focusing on programming was a better option.'
        : raw).replace(/\n/g, '<br>');
      root2.querySelectorAll(contentFieldSelector2).forEach((f) => (f.innerHTML = html));
      updateDownloadButtonState2();
    }

    function renderBodyContent2_2() {
      const raw  = (contentInput2b?.value || '');
      const html = (raw.trim() === ''
        ? 'And then in 2017, he stumbled upon bitcoin.'
        : raw).replace(/\n/g, '<br>');
      root2.querySelectorAll(contentFieldSelector2b).forEach((f) => (f.innerHTML = html));
      updateDownloadButtonState2();
    }

    if (headingInput2) {
      headingInput2.addEventListener('input', renderHeading2);
      headingInput2.addEventListener('keydown', (e) => insertSoftNewline(headingInput2, e));
    }
    if (contentInput2) {
      contentInput2.addEventListener('input', renderBodyContent1_2);
      contentInput2.addEventListener('keydown', (e) => insertSoftNewline(contentInput2, e));
    }
    if (contentInput2b) {
      contentInput2b.addEventListener('input', renderBodyContent2_2);
      contentInput2b.addEventListener('keydown', (e) => insertSoftNewline(contentInput2b, e));
    }

    // initial render
    renderHeading2();
    renderBodyContent1_2();
    renderBodyContent2_2();

    function updateDownloadButtonState2() {
      gateDownloadBtn(downloadButton2, isAllFilled2());
    }

    function downloadAsPng2(e) {
      if (!downloadButton2 || downloadButton2.classList.contains('inactive')) {
        e.preventDefault();
        alert('Please provide: ' + missingFields2().join(', ') + '.');
        return;
      }
      if (downloadButtonText2) downloadButtonText2.textContent = 'Downloading...';

      const origDisplay = parentDiv2 ? parentDiv2.style.display : '';
      if (parentDiv2 && window.innerWidth <= 1024) parentDiv2.style.display = 'block';

      html2canvas(root2, { backgroundColor: '#3B1A35', useCORS: true, scale: 4 })
        .then((canvas) => {
          canvas.toBlob((blob) => {
            const link = document.createElement('a');
            const base = (headingInput2?.value.trim() || 'design');
            const count = (downloadCounts2[base] = (downloadCounts2[base] || 0) + 1);
            link.href = URL.createObjectURL(blob);
            link.download = `${base}${count > 1 ? '-' + count : ''}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
          }, 'image/png');
        })
        .catch((err) => {
          console.error(err);
          alert('There was an issue generating the image. Try again.');
        })
        .finally(() => {
          if (parentDiv2) parentDiv2.style.display = origDisplay;
          if (downloadButtonText2) downloadButtonText2.textContent = 'Download';
        });
    }

    if (downloadButton2) downloadButton2.addEventListener('click', downloadAsPng2);

    if (cropperModal2) {
      cropperModal2.addEventListener('click', (e) => {
        if (e.target === cropperModal2 && cropper2) {
          cropper2.destroy();
          cropper2 = null;
          cropperModal2.style.display = 'none';
        }
      });
    }
    const closeCropperModalButton2 = document.getElementById('close-cropper-modal-2');
    if (closeCropperModalButton2) {
      closeCropperModalButton2.addEventListener('click', () => {
        if (cropper2) {
          cropper2.destroy();
          cropper2 = null;
        }
        if (cropperModal2) cropperModal2.style.display = 'none';
      });
    }

    window.addEventListener('resize', () => {
      if (headingInput2 && headingInput2.value.trim()) adjustFontSizeForHeadings2();
      adjustBodyWrapperHeight2();
    });
  })();

  /* ================== SLIDE 3 (Card 3 with robust selectors) ================== */
  (function () {
    const root3 = document.getElementById('id-card-3');

    const mugshotInput3           = document.getElementById('mugshot-3');
    const dragDropArea3           = document.getElementById('drag-drop-area-3');
    const fileChosenText3         = document.getElementById('file-chosen-3');
    const cropperModal3           = document.getElementById('cropper-modal-3');
    const cropperImage3           = document.getElementById('cropper-image-3');
    const saveCroppedImageButton3 = document.getElementById('save-cropped-image-3');
    const editImageButton3        = document.getElementById('edit-image-button-3');
    const deleteImageButton3      = document.getElementById('delete-image-button-3');
    const closeCropperModalButton3= document.getElementById('close-cropper-modal-3');

    const headingInput3   = document.getElementById('03-heading');
    const contentInput3   = document.getElementById('03-content');
    const contentInput3b  = document.getElementById('03-content-2');

    /* Primary + Fallback selectors for Card 3 */
    const headingTargets3   = ['.page3-design-heading', '.carousel-4-page3-header_wrapper', '.carousel-4-body-header_wrapper'];
    const content1Targets3  = ['.page3-design-content', '.design-content-body'];
    const content2Targets3  = ['.page3-design-content-2', '.design-content-body-2'];
    const imgTargets3       = ['.page3-design-image', '.id-card-mugshot-body', '.id-card-mugshot'];

    const defaultHeadingSize3 = 83.66;
    const minSize3            = 10;
    const maxLines3           = 2; /* as requested */
    const lineHeightRatio3    = 0.8;

    const downloadButton3     = document.getElementById('download-3');
    const downloadButtonText3 = downloadButton3?.querySelector('.button-text');

    const parentDiv3  = document.querySelector('.preview_block');

    let cropper3 = null;
    let uploadedImageData3 = null;
    const downloadCounts3 = {};

    if (fileChosenText3) fileChosenText3.style.display = 'none';
    if (editImageButton3)   editImageButton3.style.display   = 'none';
    if (deleteImageButton3) deleteImageButton3.style.display = 'none';

    // Set placeholder image on first available image target
    (function setDefaultImg3(){
      for (const sel of imgTargets3) {
        const node = root3?.querySelector(sel);
        if (node) {
          node.src = 'https://cdn.prod.website-files.com/678517a28eb2d34a4320905a/6785414deac53aed0c68c0b9_Placeholder%20IMG.png';
          node.crossOrigin = 'anonymous';
          break;
        }
      }
    })();

    function handleImageFile3(file) {
      if (!file || !/image\/(png|jpeg|jpg|gif)/i.test(file.type)) {
        alert('Please upload a valid image file (PNG, JPEG, GIF).');
        return;
      }
      if (fileChosenText3) {
        fileChosenText3.textContent = file.name;
        fileChosenText3.style.display = 'block';
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImageData3 = e.target.result;
        if (!cropperImage3 || !cropperModal3) return;
        cropperImage3.src = uploadedImageData3;
        cropperImage3.crossOrigin = 'anonymous';
        cropperModal3.style.display = 'block';
        /* square aspect for 342 x 342 */
        cropper3 = new Cropper(cropperImage3, { aspectRatio: 1, viewMode: 2 });
        if (editImageButton3)   editImageButton3.style.display   = 'inline-block';
        if (deleteImageButton3) deleteImageButton3.style.display = 'inline-block';
        updateDownloadButtonState3();
      };
      reader.readAsDataURL(file);
    }

    if (mugshotInput3) mugshotInput3.addEventListener('change', (e) => handleImageFile3(e.target.files[0]));
    if (dragDropArea3) {
      dragDropArea3.addEventListener('dragover',  (e) => { e.preventDefault(); dragDropArea3.classList.add('drag-over'); });
      dragDropArea3.addEventListener('dragleave', (e) => { e.preventDefault(); dragDropArea3.classList.remove('drag-over'); });
      dragDropArea3.addEventListener('drop',      (e) => {
        e.preventDefault();
        dragDropArea3.classList.remove('drag-over');
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleImageFile3(f);
      });
    }

    if (saveCroppedImageButton3) {
      saveCroppedImageButton3.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!cropper3) return;
        const canvas = cropper3.getCroppedCanvas({
          width: 342,
          height: 342,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        const png = canvas.toDataURL('image/png');
        // write into first matching image collection
        let set = false;
        for (const sel of imgTargets3) {
          const imgs = root3.querySelectorAll(sel);
          if (imgs.length) {
            imgs.forEach(img => { img.crossOrigin = 'anonymous'; img.src = png; });
            set = true;
            break;
          }
        }
        if (!set) {
          // fallback by class (if any)
          setAllImgSrcByClass(root3, 'page3-design-image', png);
        }
        uploadedImageData3 = png;
        cropper3.destroy();
        cropper3 = null;
        if (cropperModal3) cropperModal3.style.display = 'none';
        updateDownloadButtonState3();
      });
    }

    if (editImageButton3) {
      editImageButton3.addEventListener('click', () => {
        if (!uploadedImageData3 || !cropperImage3 || !cropperModal3) return;
        cropperImage3.src = uploadedImageData3;
        cropperImage3.crossOrigin = 'anonymous';
        cropperModal3.style.display = 'block';
        /* square aspect for 342 x 342 */
        cropper3 = new Cropper(cropperImage3, { aspectRatio: 1, viewMode: 2 });
      });
    }

    if (deleteImageButton3) {
      deleteImageButton3.addEventListener('click', () => {
        for (const sel of imgTargets3) {
          root3.querySelectorAll(sel).forEach(img => img.src = '');
        }
        uploadedImageData3 = null;
        if (fileChosenText3) {
          fileChosenText3.textContent = 'No file chosen';
          fileChosenText3.style.display = 'none';
        }
        if (mugshotInput3) mugshotInput3.value = '';
        if (editImageButton3)   editImageButton3.style.display   = 'none';
        if (deleteImageButton3) deleteImageButton3.style.display = 'none';
        updateDownloadButtonState3();
      });
    }

    function adjustFontSizeForHeadings3() {
      const fields = getMeasureNodes(root3, headingTargets3);
      fields.forEach((field) => {
        field.style.fontSize   = defaultHeadingSize3 + 'px';
        field.style.lineHeight = lineHeightRatio3;

        const lines = Math.round(field.scrollHeight / (defaultHeadingSize3 * lineHeightRatio3));
        if (lines > maxLines3) {
          let low  = minSize3;
          let high = defaultHeadingSize3;
          let best = minSize3;

          while (low <= high) {
            const mid = (low + high) / 2;
            field.style.fontSize = mid + 'px';
            const currLines = Math.round(field.scrollHeight / (mid * lineHeightRatio3));
            if (currLines <= maxLines3) {
              best = mid;
              low  = mid + 0.1;
            } else {
              high = mid - 0.1;
            }
          }
          field.style.fontSize = best + 'px';
        }
      });
    }

    /* dynamic height for page 3 heading wrapper */
    function adjustPage3WrapperHeight3() {
      const wrappers = root3.querySelectorAll('.carousel-4-page3-header_wrapper, .carousel-4-body-header_wrapper');
      wrappers.forEach((wrapper) => {
        wrapper.style.height = 'auto';
        wrapper.style.height = wrapper.scrollHeight + 'px';
      });
    }

    function missingFields3() {
      const missing = [];
      if (!uploadedImageData3) missing.push('mugshot image');
      if (!headingInput3 || headingInput3.value.trim() === '') missing.push('heading');
      if (!contentInput3 || contentInput3.value.trim() === '') missing.push('content #1');
      if (!contentInput3b || contentInput3b.value.trim() === '') missing.push('content #2');
      return missing;
    }
    function isAllFilled3() { return missingFields3().length === 0; }

    function renderHeading3() {
      const raw = (headingInput3?.value || '').trim();
      const defaultText = 'The crypto jihadist.';
      const html = formatHeadingFromInput(raw === '' ? defaultText : headingInput3.value);

      writeHtmlIntoTargets(root3, headingTargets3, html);
      if (raw === '') setStyleOnTargets(root3, headingTargets3, 'fontSize', defaultHeadingSize3 + 'px');

      if (raw !== '') adjustFontSizeForHeadings3();
      adjustPage3WrapperHeight3();
      updateDownloadButtonState3();
    }

    function renderBodyContent1_3() {
      const raw  = (contentInput3?.value || '');
      const def  = "Initially, he thought it was a scam. But the more he read about it, the more he became convinced about it’s potentials.";
      const html = (raw.trim() === '' ? def : raw).replace(/\n/g, '<br>');
      writeHtmlIntoTargets(root3, content1Targets3, html);
      updateDownloadButtonState3();
    }

    function renderBodyContent2_3() {
      const raw  = (contentInput3b?.value || '');
      const def  = "And so, he learned Rust and started contributing to Ethereum’s open source libraries.";
      const html = (raw.trim() === '' ? def : raw).replace(/\n/g, '<br>');
      writeHtmlIntoTargets(root3, content2Targets3, html);
      updateDownloadButtonState3();
    }

    if (headingInput3) {
      headingInput3.addEventListener('input', renderHeading3);
      headingInput3.addEventListener('keydown', (e) => insertSoftNewline(headingInput3, e));
    }
    if (contentInput3) {
      contentInput3.addEventListener('input', renderBodyContent1_3);
      contentInput3.addEventListener('keydown', (e) => insertSoftNewline(contentInput3, e));
    }
    if (contentInput3b) {
      contentInput3b.addEventListener('input', renderBodyContent2_3);
      contentInput3b.addEventListener('keydown', (e) => insertSoftNewline(contentInput3b, e));
    }

    // initial render
    renderHeading3();
    renderBodyContent1_3();
    renderBodyContent2_3();
    updateDownloadButtonState3();

    function updateDownloadButtonState3() {
      gateDownloadBtn(downloadButton3, isAllFilled3());
    }

    function downloadAsPng3(e) {
      if (!downloadButton3 || downloadButton3.classList.contains('inactive')) {
        e.preventDefault();
        alert('Please provide: ' + missingFields3().join(', ') + '.');
        return;
      }
      if (downloadButtonText3) downloadButtonText3.textContent = 'Downloading...';

      const origDisplay = parentDiv3 ? parentDiv3.style.display : '';
      if (parentDiv3 && window.innerWidth <= 1024) parentDiv3.style.display = 'block';

      html2canvas(root3, { backgroundColor: '#3B1A35', useCORS: true, scale: 4 })
        .then((canvas) => {
          canvas.toBlob((blob) => {
            const link = document.createElement('a');
            const base = (headingInput3?.value.trim() || 'design');
            const count = (downloadCounts3[base] = (downloadCounts3[base] || 0) + 1);
            link.href = URL.createObjectURL(blob);
            link.download = `${base}${count > 1 ? '-' + count : ''}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
          }, 'image/png');
        })
        .catch((err) => {
          console.error(err);
          alert('There was an issue generating the image. Try again.');
        })
        .finally(() => {
          if (parentDiv3) parentDiv3.style.display = origDisplay;
          if (downloadButtonText3) downloadButtonText3.textContent = 'Download';
        });
    }

    if (downloadButton3) downloadButton3.addEventListener('click', downloadAsPng3);

    if (cropperModal3) {
      cropperModal3.addEventListener('click', (e) => {
        if (e.target === cropperModal3 && cropper3) {
          cropper3.destroy(); cropper3 = null;
          cropperModal3.style.display = 'none';
        }
      });
    }
    if (closeCropperModalButton3) {
      closeCropperModalButton3.addEventListener('click', () => {
        if (cropper3) { cropper3.destroy(); cropper3 = null; }
        if (cropperModal3) cropperModal3.style.display = 'none';
      });
    }

    window.addEventListener('resize', () => {
      if (headingInput3 && headingInput3.value.trim()) adjustFontSizeForHeadings3();
      adjustPage3WrapperHeight3();
    });
  })();

  /* ================== SLIDE 4 (Card 4 with robust selectors) ================== */
  (function () {
    const root4 = document.getElementById('id-card-4');

    const mugshotInput4           = document.getElementById('mugshot-4');
    const dragDropArea4           = document.getElementById('drag-drop-area-4');
    const fileChosenText4         = document.getElementById('file-chosen-4');
    const cropperModal4           = document.getElementById('cropper-modal-4');
    const cropperImage4           = document.getElementById('cropper-image-4');
    const saveCroppedImageButton4 = document.getElementById('save-cropped-image-4');
    const editImageButton4        = document.getElementById('edit-image-button-4');
    const deleteImageButton4      = document.getElementById('delete-image-button-4');
    const closeCropperModalButton4= document.getElementById('close-cropper-modal-4');

    const headingInput4   = document.getElementById('04-heading');
    const contentInput4   = document.getElementById('04-content');
    const contentInput4b  = document.getElementById('04-content-2');

    /* Primary + Fallback selectors for Card 4 */
    const headingTargets4   = ['.page4-design-heading', '.carousel-4-page4-header_wrapper', '.carousel-4-body-header_wrapper'];
    const content1Targets4  = ['.page4-design-content', '.design-content-body'];
    const content2Targets4  = ['.page4-design-content-2', '.design-content-body-2'];
    const imgTargets4       = ['.page4-design-image', '.id-card-mugshot-body', '.id-card-mugshot'];

    const defaultHeadingSize4 = 83.66;
    const minSize4            = 10;
    const maxLines4           = 3;
    const lineHeightRatio4    = 0.8;

    const downloadButton4     = document.getElementById('download-4');
    const downloadButtonText4 = downloadButton4?.querySelector('.button-text');

    const parentDiv4  = document.querySelector('.preview_block');

    let cropper4 = null;
    let uploadedImageData4 = null;
    const downloadCounts4 = {};

    if (fileChosenText4) fileChosenText4.style.display = 'none';
    if (editImageButton4)   editImageButton4.style.display   = 'none';
    if (deleteImageButton4) deleteImageButton4.style.display = 'none';

    // Set placeholder image
    (function setDefaultImg4(){
      for (const sel of imgTargets4) {
        const node = root4?.querySelector(sel);
        if (node) {
          node.src = 'https://cdn.prod.website-files.com/678517a28eb2d34a4320905a/6785414deac53aed0c68c0b9_Placeholder%20IMG.png';
          node.crossOrigin = 'anonymous';
          break;
        }
      }
    })();

    function handleImageFile4(file) {
      if (!file || !/image\/(png|jpeg|jpg|gif)/i.test(file.type)) {
        alert('Please upload a valid image file (PNG, JPEG, GIF).');
        return;
      }
      if (fileChosenText4) {
        fileChosenText4.textContent = file.name;
        fileChosenText4.style.display = 'block';
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImageData4 = e.target.result;
        if (!cropperImage4 || !cropperModal4) return;
        cropperImage4.src = uploadedImageData4;
        cropperImage4.crossOrigin = 'anonymous';
        cropperModal4.style.display = 'block';
        /* square aspect for 342 x 342 (same as Card 3) */
        cropper4 = new Cropper(cropperImage4, { aspectRatio: 1, viewMode: 2 });
        if (editImageButton4)   editImageButton4.style.display   = 'inline-block';
        if (deleteImageButton4) deleteImageButton4.style.display = 'inline-block';
        updateDownloadButtonState4();
      };
      reader.readAsDataURL(file);
    }

    if (mugshotInput4) mugshotInput4.addEventListener('change', (e) => handleImageFile4(e.target.files[0]));
    if (dragDropArea4) {
      dragDropArea4.addEventListener('dragover',  (e) => { e.preventDefault(); dragDropArea4.classList.add('drag-over'); });
      dragDropArea4.addEventListener('dragleave', (e) => { e.preventDefault(); dragDropArea4.classList.remove('drag-over'); });
      dragDropArea4.addEventListener('drop',      (e) => {
        e.preventDefault();
        dragDropArea4.classList.remove('drag-over');
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleImageFile4(f);
      });
    }

    if (saveCroppedImageButton4) {
      saveCroppedImageButton4.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!cropper4) return;
        const canvas = cropper4.getCroppedCanvas({
          width: 342,
          height: 342,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        const png = canvas.toDataURL('image/png');
        let set = false;
        for (const sel of imgTargets4) {
          const imgs = root4.querySelectorAll(sel);
          if (imgs.length) {
            imgs.forEach(img => { img.crossOrigin = 'anonymous'; img.src = png; });
            set = true;
            break;
          }
        }
        if (!set) {
          setAllImgSrcByClass(root4, 'page4-design-image', png);
        }
        uploadedImageData4 = png;
        cropper4.destroy();
        cropper4 = null;
        if (cropperModal4) cropperModal4.style.display = 'none';
        updateDownloadButtonState4();
      });
    }

    if (editImageButton4) {
      editImageButton4.addEventListener('click', () => {
        if (!uploadedImageData4 || !cropperImage4 || !cropperModal4) return;
        cropperImage4.src = uploadedImageData4;
        cropperImage4.crossOrigin = 'anonymous';
        cropperModal4.style.display = 'block';
        /* square aspect for 342 x 342 */
        cropper4 = new Cropper(cropperImage4, { aspectRatio: 1, viewMode: 2 });
      });
    }

    if (deleteImageButton4) {
      deleteImageButton4.addEventListener('click', () => {
        for (const sel of imgTargets4) {
          root4.querySelectorAll(sel).forEach(img => img.src = '');
        }
        uploadedImageData4 = null;
        if (fileChosenText4) {
          fileChosenText4.textContent = 'No file chosen';
          fileChosenText4.style.display = 'none';
        }
        if (mugshotInput4) mugshotInput4.value = '';
        if (editImageButton4)   editImageButton4.style.display   = 'none';
        if (deleteImageButton4) deleteImageButton4.style.display = 'none';
        updateDownloadButtonState4();
      });
    }

    function adjustFontSizeForHeadings4() {
      const fields = getMeasureNodes(root4, headingTargets4);
      fields.forEach((field) => {
        field.style.fontSize   = defaultHeadingSize4 + 'px';
        field.style.lineHeight = lineHeightRatio4;

        const lines = Math.round(field.scrollHeight / (defaultHeadingSize4 * lineHeightRatio4));
        if (lines > maxLines4) {
          let low  = minSize4;
          let high = defaultHeadingSize4;
          let best = minSize4;

          while (low <= high) {
            const mid = (low + high) / 2;
            field.style.fontSize = mid + 'px';
            const currLines = Math.round(field.scrollHeight / (mid * lineHeightRatio4));
            if (currLines <= maxLines4) {
              best = mid;
              low  = mid + 0.1;
            } else {
              high = mid - 0.1;
            }
          }
          field.style.fontSize = best + 'px';
        }
      });
    }

    /* dynamic height for page 4 heading wrapper */
    function adjustPage4WrapperHeight4() {
      const wrappers = root4.querySelectorAll('.carousel-4-page4-header_wrapper, .carousel-4-body-header_wrapper');
      wrappers.forEach((wrapper) => {
        wrapper.style.height = 'auto';
        wrapper.style.height = wrapper.scrollHeight + 'px';
      });
    }

    function missingFields4() {
      const missing = [];
      if (!uploadedImageData4) missing.push('mugshot image');
      if (!headingInput4 || headingInput4.value.trim() === '') missing.push('heading');
      if (!contentInput4 || contentInput4.value.trim() === '') missing.push('content #1');
      if (!contentInput4b || contentInput4b.value.trim() === '') missing.push('content #2');
      return missing;
    }
    function isAllFilled4() { return missingFields4().length === 0; }

    function renderHeading4() {
      const raw = (headingInput4?.value || '').trim();
      const defaultText = "Working with Ethereum’s co-founder.";
      const html = formatHeadingFromInput(raw === '' ? defaultText : headingInput4.value);

      writeHtmlIntoTargets(root4, headingTargets4, html);
      if (raw === '') setStyleOnTargets(root4, headingTargets4, 'fontSize', defaultHeadingSize4 + 'px');

      if (raw !== '') adjustFontSizeForHeadings4();
      adjustPage4WrapperHeight4();
      updateDownloadButtonState4();
    }

    function renderBodyContent1_4() {
      const raw  = (contentInput4?.value || '');
      const def  = "In 2018, Parity Ethereum was hiring and he applied.\nHis contributions were noticed and he got invited for an interview.";
      const html = (raw.trim() === '' ? def : raw).replace(/\n/g, '<br>');
      writeHtmlIntoTargets(root4, content1Targets4, html);
      updateDownloadButtonState4();
    }

    function renderBodyContent2_4() {
      const raw  = (contentInput4b?.value || '');
      const def  = "He impressed the Parity team, and so he got hired.";
      const html = (raw.trim() === '' ? def : raw).replace(/\n/g, '<br>');
      writeHtmlIntoTargets(root4, content2Targets4, html);
      updateDownloadButtonState4();
    }

    if (headingInput4) {
      headingInput4.addEventListener('input', renderHeading4);
      headingInput4.addEventListener('keydown', (e) => insertSoftNewline(headingInput4, e));
    }
    if (contentInput4) {
      contentInput4.addEventListener('input', renderBodyContent1_4);
      contentInput4.addEventListener('keydown', (e) => insertSoftNewline(contentInput4, e));
    }
    if (contentInput4b) {
      contentInput4b.addEventListener('input', renderBodyContent2_4);
      contentInput4b.addEventListener('keydown', (e) => insertSoftNewline(contentInput4b, e));
    }

    // initial render
    renderHeading4();
    renderBodyContent1_4();
    renderBodyContent2_4();
    updateDownloadButtonState4();

    function updateDownloadButtonState4() {
      gateDownloadBtn(downloadButton4, isAllFilled4());
    }

    function downloadAsPng4(e) {
      if (!downloadButton4 || downloadButton4.classList.contains('inactive')) {
        e.preventDefault();
        alert('Please provide: ' + missingFields4().join(', ') + '.');
        return;
      }
      if (downloadButtonText4) downloadButtonText4.textContent = 'Downloading...';

      const origDisplay = parentDiv4 ? parentDiv4.style.display : '';
      if (parentDiv4 && window.innerWidth <= 1024) parentDiv4.style.display = 'block';

      html2canvas(root4, { backgroundColor: '#3B1A35', useCORS: true, scale: 4 })
        .then((canvas) => {
          canvas.toBlob((blob) => {
            const link = document.createElement('a');
            const base = (headingInput4?.value.trim() || 'design');
            const count = (downloadCounts4[base] = (downloadCounts4[base] || 0) + 1);
            link.href = URL.createObjectURL(blob);
            link.download = `${base}${count > 1 ? '-' + count : ''}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
          }, 'image/png');
        })
        .catch((err) => {
          console.error(err);
          alert('There was an issue generating the image. Try again.');
        })
        .finally(() => {
          if (parentDiv4) parentDiv4.style.display = origDisplay;
          if (downloadButtonText4) downloadButtonText4.textContent = 'Download';
        });
    }

    if (downloadButton4) downloadButton4.addEventListener('click', downloadAsPng4);

    if (cropperModal4) {
      cropperModal4.addEventListener('click', (e) => {
        if (e.target === cropperModal4 && cropper4) {
          cropper4.destroy(); cropper4 = null;
          cropperModal4.style.display = 'none';
        }
      });
    }
    if (closeCropperModalButton4) {
      closeCropperModalButton4.addEventListener('click', () => {
        if (cropper4) { cropper4.destroy(); cropper4 = null; }
        if (cropperModal4) cropperModal4.style.display = 'none';
      });
    }

    window.addEventListener('resize', () => {
      if (headingInput4 && headingInput4.value.trim()) adjustFontSizeForHeadings4();
      adjustPage4WrapperHeight4();
    });
  })();
});
