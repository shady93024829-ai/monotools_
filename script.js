/* ==========================================================================
   MonoTools — Static Client-Side Application
   Bilingual (EN/AR) · SPA show-hide navigation · 5 in-browser tools
   No backend. All processing happens locally on the user's device.
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     UTILITIES
     ====================================================================== */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else e.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function downloadBlob(blob, filename) {
    // Append a unique suffix so re-downloading a new result never gets
    // mistaken by the browser for the same previous file (avoids the
    // "Download file again?" prompt when content changes but the base
    // name stays the same).
    const dot = filename.lastIndexOf('.');
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const uniqueName = dot === -1
      ? `${filename}-${stamp}`
      : `${filename.slice(0, dot)}-${stamp}${filename.slice(dot)}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = uniqueName;
    document.body.appendChild(a); a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function toast(msg) {
    let node = $('#toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'toast';
      node.className = 'toast';
      document.body.appendChild(node);
    }
    node.textContent = msg;
    node.classList.add('show');
    clearTimeout(node._t);
    node._t = setTimeout(() => node.classList.remove('show'), 1600);
  }

  function copyText(text) {
    if (!text) return;
    const done = () => toast(t('copied'));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
    done();
  }

  const ICONS = {
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M12 16l-4-4M12 16l4-4M4 20h16"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  };

  function spinner(msg) {
    return el('div', { class: 'spinner-wrap' },
      el('div', { class: 'spinner' }),
      el('p', {}, msg || t('processing'))
    );
  }

  function showError(parent, msg) {
    let box = $('.error-box', parent);
    if (!box) { box = el('div', { class: 'error-box' }); parent.appendChild(box); }
    box.textContent = msg;
    box.classList.add('active');
  }
  
  function clearError(parent) {
    const box = $('.error-box', parent);
    if (box) box.classList.remove('active');
  }

  function wireUploadZone(zoneEl, inputEl, onFile) {
    zoneEl.addEventListener('click', () => inputEl.click());
    inputEl.addEventListener('change', () => {
      if (inputEl.files && inputEl.files.length) {
        Array.from(inputEl.files).forEach(onFile);
      }
      inputEl.value = '';
    });
    zoneEl.addEventListener('dragover', e => { e.preventDefault(); zoneEl.classList.add('dragover'); });
    zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('dragover'));
    zoneEl.addEventListener('drop', e => {
      e.preventDefault();
      zoneEl.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files && files.length) Array.from(files).forEach(onFile);
    });
  }

  /* ======================================================================
     i18n — Bilingual (English default, Arabic toggle)
     ====================================================================== */
  const I18N = {
    en: {
      'nav.home': 'Home', 'nav.qr': 'QR Generator', 'nav.bg': 'Background Remover',
      'nav.compress': 'Image Compressor', 'nav.pfp': 'Profile Pic Maker', 'nav.youtube': 'YouTube Thumbnail', 'nav.pdf': 'Image to PDF',
      'nav.wordCounter': 'Word Counter', 'nav.passwordGenerator': 'Password Generator', 'nav.caseConverter': 'Case Converter',
      'nav.dedupe': 'Remove Duplicate Lines', 'nav.textDiff': 'Text Diff Checker', 'nav.loremIpsum': 'Lorem Ipsum Generator',
      'nav.slugGenerator': 'URL Slug Generator', 'nav.jsonFormatter': 'JSON Formatter', 'nav.colorConverter': 'Color Converter',
      'hero.title': 'Free Tools, Right in Your Browser',
      'hero.sub': 'Fifteen fast, free tools that run entirely in your browser. No uploads, no sign-up — your data never leaves your device.',
      'card.qr.title': 'QR Code Generator', 'card.qr.desc': 'Generate QR codes instantly in your browser. Square, high-resolution, downloadable as PNG.',
      'card.bg.title': 'Background Remover', 'card.bg.desc': 'Remove image backgrounds with on-device AI. Export transparent PNG instantly.',
      'card.compress.title': 'Image Compressor', 'card.compress.desc': 'Compress images right in your browser — automatically, at the best possible quality.',
      'card.pfp.title': 'Profile Pic Maker', 'card.pfp.desc': 'Turn any photo into a clean circular profile picture with a transparent background. Drag and zoom to frame it just right.',
      'card.yt.title': 'YouTube Thumbnail', 'card.yt.desc': 'Download any YouTube video thumbnail in the highest available quality, in one click.',
      'card.pdf.title': 'Image to PDF', 'card.pdf.desc': 'Convert multiple images into a single PDF file, right in your browser. Fast and secure.',
      'card.wordCounter.title': 'Word Counter', 'card.wordCounter.desc': 'Count words, characters, sentences, and estimated reading time, with a keyword-density breakdown.',
      'card.passwordGenerator.title': 'Password Generator', 'card.passwordGenerator.desc': 'Generate strong, random passwords with full control over length and character types.',
      'card.caseConverter.title': 'Case Converter', 'card.caseConverter.desc': 'Convert text between uppercase, lowercase, title case, sentence case, and alternating case instantly.',
      'card.dedupe.title': 'Remove Duplicate Lines', 'card.dedupe.desc': 'Clean up a list by removing duplicate lines while preserving the original order.',
      'card.textDiff.title': 'Text Diff Checker', 'card.textDiff.desc': 'Compare two blocks of text and instantly see every line that was added or removed.',
      'card.loremIpsum.title': 'Lorem Ipsum Generator', 'card.loremIpsum.desc': 'Generate placeholder paragraphs of classic Lorem Ipsum text for mockups and layouts.',
      'card.slugGenerator.title': 'URL Slug Generator', 'card.slugGenerator.desc': 'Turn any title into a clean, SEO-friendly URL slug automatically.',
      'card.jsonFormatter.title': 'JSON Formatter', 'card.jsonFormatter.desc': 'Format, validate, and color-highlight JSON data instantly, with clear syntax error detection.',
      'card.colorConverter.title': 'Color Converter', 'card.colorConverter.desc': 'Convert instantly between HEX, RGB, and HSL color codes, with a live preview swatch.',
      'card.cta': 'Open tool →',
      'trust': '100% Privacy: All files are processed locally on your device',
      'feat.free': 'Completely Free', 'feat.instant': 'Instant Results',
      'feat.private': 'Full Privacy', 'feat.nosignup': 'No Sign-up',
      'ad.top': 'Ad Space — Top', 'ad.bottom': 'Ad Space — Bottom',
      'back': 'Back',
      'processing': 'Processing…',
      'qr.title': 'QR Code Generator',
      'qr.desc': 'Generate a QR code instantly in your browser. Enter text or a URL, choose the error-correction level, then download.',
      'qr.content': 'Content (link)', 'qr.contentPh': 'Paste a link (URL)...',
      'qr.size': 'Image size', 'qr.ecc': 'Error correction', 'qr.generate': 'Generate QR', 'qr.download': 'Download PNG',
      'qr.empty': 'Your QR code will appear here', 'qr.errEmpty': 'Please enter content to generate a QR code.',
      'bg.title': 'Background Remover',
      'bg.desc': "Remove image backgrounds with on-device AI (RMBG-1.4). The model downloads once on first use, then runs entirely in your browser. Export a transparent PNG.",
      'bg.loading': 'Loading AI engine… (first run only)', 'bg.model': 'Downloading AI model…',
      'bg.processing': 'Removing background…', 'bg.done': 'Background removed',
      'bg.disclaimer': 'Please note: the image is processed entirely inside your browser and is never uploaded to any external server, guaranteeing 100% privacy. The process may take one to two minutes depending on your device speed. Because we use a lightweight AI model (Lite Model) to keep your browser stable, results may not be perfectly accurate when the image background is very complex or the colors overlap heavily.',
      'bg.download': 'Download PNG', 'bg.errFail': 'Background removal failed. Please try another image.',
      'compress.title': 'Image Compressor',
      'compress.desc': 'Compress any image directly in your browser using the Canvas API — automatically resizes very large photos and finds the highest quality that keeps the file under 1MB. Runs entirely on your device.',
      'compress.originalSize': 'Original Size', 'compress.compressedSize': 'Compressed Size',
      'compress.download': 'Download JPG', 'compress.errFail': 'Image compression failed. Please try another image.',
      'pfp.title': 'Profile Pic Maker',
      'pfp.desc': 'Crop your photo into a clean circular profile picture with a transparent background. Drag to reposition, pinch or scroll to zoom. Runs entirely on your device.',
      'pfp.hint': 'Drag to reposition. Pinch or scroll to zoom.',
      'pfp.download': 'Download PNG', 'pfp.errFail': 'Could not process that image. Please try another one.',
      'yt.title': 'YouTube Thumbnail Downloader',
      'yt.desc': 'Paste a YouTube video URL to view all available thumbnails in every quality, then download any of them in one click.',
      'yt.urlPh': 'https://www.youtube.com/watch?v=...', 'yt.fetch': 'Fetch',
      'yt.errEmpty': 'Please enter a YouTube URL.', 'yt.errInvalid': 'Could not find a YouTube video ID in that URL.',
      'yt.searching': 'Searching for thumbnails…', 'yt.unavailable': 'Not available for this video',
      'yt.download': 'Download', 'yt.bytes': 'bytes', 'yt.openDirect': 'Open image (save manually)',
      'pdf.title': 'Image to PDF',
      'pdf.desc': 'Select one or more images, arrange them, then convert to a single PDF file right in your browser. Fast and secure — nothing is uploaded.',
      'pdf.drop': 'Drop images here or click to select (multiple allowed)',
      'pdf.portrait': 'Portrait', 'pdf.landscape': 'Landscape', 'pdf.pageSize': 'Page size',
      'pdf.convert': 'Convert to PDF', 'pdf.processing': 'Creating PDF…', 'pdf.download': 'Download PDF',
      'pdf.images': 'Images', 'pdf.size': 'Size', 'pdf.orient': 'Orientation',
      'pdf.errEmpty': 'Add at least one image first.', 'pdf.remove': 'Remove',
      'copied': 'Copied to clipboard', 'unit.min': 'min', 'unit.sec': 'sec', 'btn.copy': 'Copy', 'btn.clear': 'Clear',

      'wc.title': 'Word Counter', 'wc.desc': 'Paste or type your text below to see live statistics, including word count, character count, and estimated reading time.',
      'wc.placeholder': 'Start typing or paste your text here…',
      'wc.words': 'Words', 'wc.chars': 'Characters', 'wc.charsNoSpace': 'Characters (no spaces)', 'wc.sentences': 'Sentences',
      'wc.paragraphs': 'Paragraphs', 'wc.readingTime': 'Reading time', 'wc.speakingTime': 'Speaking time', 'wc.keywordDensity': 'Keyword Density (Top 5)',

      'pg.title': 'Password Generator', 'pg.desc': 'Generate a strong, random password locally in your browser. Nothing is sent anywhere.',
      'pg.length': 'Length', 'pg.upper': 'Uppercase (A-Z)', 'pg.lower': 'Lowercase (a-z)', 'pg.nums': 'Numbers (0-9)', 'pg.syms': 'Symbols (!@#$…)',
      'pg.generate': 'Generate Password', 'pg.strength': 'Strength', 'pg.weak': 'Weak', 'pg.medium': 'Medium', 'pg.strong': 'Strong',
      'pg.noneSelected': 'Select at least one character type.',

      'cc.title': 'Case Converter', 'cc.desc': 'Paste your text and convert it instantly to any letter case.',
      'cc.placeholder': 'Type or paste your text here…', 'cc.upper': 'UPPERCASE', 'cc.lower': 'lowercase', 'cc.titleCase': 'Title Case',
      'cc.sentenceCase': 'Sentence case', 'cc.altCase': 'aLtErNaTiNg cAsE', 'cc.result': 'Result',

      'dd.title': 'Remove Duplicate Lines', 'dd.desc': 'Paste a list of lines and instantly remove duplicates while keeping the original order.',
      'dd.placeholder': 'Paste your list here, one item per line…', 'dd.trim': 'Ignore leading/trailing spaces', 'dd.run': 'Remove Duplicates',
      'dd.linesIn': 'Lines in', 'dd.linesOut': 'Lines out', 'dd.removed': 'Removed', 'dd.result': 'Result',

      'df.title': 'Text Diff Checker', 'df.desc': 'Compare two blocks of text line by line and see exactly what changed.',
      'df.original': 'Original text', 'df.modified': 'Modified text', 'df.originalPh': 'Paste the original text…', 'df.modifiedPh': 'Paste the modified text…',
      'df.compare': 'Compare', 'df.identical': 'The two texts are identical.', 'df.tooLarge': 'Text is too long to compare (600 lines max per side).',

      'li.title': 'Lorem Ipsum Generator', 'li.desc': 'Generate placeholder paragraphs of classic Lorem Ipsum text for mockups and layouts.',
      'li.count': 'Number of paragraphs', 'li.generate': 'Generate Text',

      'sg.title': 'URL Slug Generator', 'sg.desc': 'Turn any title or phrase into a clean, SEO-friendly URL slug automatically as you type.',
      'sg.inputLabel': 'Title or phrase', 'sg.placeholder': 'e.g. My Awesome Blog Post!', 'sg.empty': 'Your slug will appear here…', 'sg.result': 'Generated slug',

      'jf.title': 'JSON Formatter & Validator', 'jf.desc': 'Paste JSON data to format it with syntax highlighting, or catch and locate errors instantly.',
      'jf.placeholder': 'Paste your JSON here…', 'jf.format': 'Format', 'jf.minify': 'Minify',
      'jf.errInvalid': 'Invalid JSON',

      'cv.title': 'Color Converter', 'cv.desc': 'Convert instantly between HEX, RGB, and HSL color codes, with a live preview swatch.',
      'cv.inputLabel': 'Color value', 'cv.placeholder': 'e.g. #6366f1, rgb(99,102,241), or hsl(239,84%,67%)',
      'cv.errInvalid': 'Could not recognize that color format.',

      'upload.drop': 'Drop image here or click to select',
      'upload.sub': 'PNG · JPG · WEBP · BMP — processed locally',
      'footer.tag': 'Minimalist image tools',
      'footer.dev': 'Developed by', 'footer.copy': 'All rights reserved',
      'footer.privacy': 'Privacy Policy', 'footer.terms': 'Terms of Use',
      'cookie.msg': 'This site may use cookies for ads and basic analytics. By continuing to use it, you agree to our',
      'cookie.privacyLink': 'Privacy Policy', 'cookie.accept': 'Got it',
      'footer.about': 'About Us', 'footer.contact': 'Contact',
      'seo.qr.heading': 'About this QR code generator',
      'seo.qr.intro': 'Create a QR code from any link in seconds. Everything happens right in your browser — nothing is uploaded to a server, so your QR codes stay completely private.',
      'seo.qr.howto.1': 'Type or paste the text or link you want to encode.',
      'seo.qr.howto.2': 'Choose your preferred error-correction level and size.',
      'seo.qr.howto.3': 'Click Generate and download the PNG.',
      'seo.qr.faqHeading': 'Frequently asked questions',
      'seo.qr.faq.1.q': 'Do I need an account to create a QR code?',
      'seo.qr.faq.1.a': 'No. This tool works instantly with no sign-up and no limit on how many codes you generate.',
      'seo.qr.faq.2.q': 'Will the QR code expire?',
      'seo.qr.faq.2.a': "No. It's a static image with your content permanently embedded — it works forever, even offline.",
      'seo.qr.faq.3.q': 'What can I put inside a QR code?',
      'seo.qr.faq.3.a': 'A link (URL) — for example a website address, a social media page, or a video link.',
      'seo.bg.heading': 'About this background remover',
      'seo.bg.intro': 'Remove the background from any photo automatically using an AI model that runs entirely on your device. No image is ever uploaded anywhere — the AI processing happens locally in your browser, then you download a transparent PNG.',
      'seo.bg.howto.1': 'Upload a photo.',
      'seo.bg.howto.2': 'Wait a few seconds while the on-device AI detects the subject.',
      'seo.bg.howto.3': 'Download the transparent PNG.',
      'seo.bg.faqHeading': 'Frequently asked questions',
      'seo.bg.faq.1.q': 'Is my photo uploaded to a server?',
      'seo.bg.faq.1.a': 'No. The AI model downloads once to your browser and all processing happens on your own device.',
      'seo.bg.faq.2.q': 'Why did some edges come out rough?',
      'seo.bg.faq.2.a': 'Complex backgrounds with busy edges or similar colors can confuse any AI background remover, including paid ones. Try a photo with clearer contrast between subject and background for best results.',
      'seo.bg.faq.3.q': 'What file type do I get?',
      'seo.bg.faq.3.a': 'A PNG file with a transparent background, ready to use anywhere.',
      'seo.compress.heading': 'About this image compressor',
      'seo.compress.intro': 'Shrink large photos down to under 1MB automatically, while keeping the highest visual quality possible. The tool resizes oversized images and fine-tunes JPEG quality on its own — no sliders, no guesswork.',
      'seo.compress.howto.1': 'Upload your image.',
      'seo.compress.howto.2': 'The tool automatically resizes and compresses it.',
      'seo.compress.howto.3': 'Download the compressed JPG.',
      'seo.compress.faqHeading': 'Frequently asked questions',
      'seo.compress.faq.1.q': 'Will my photo lose quality?',
      'seo.compress.faq.1.a': 'The tool always finds the highest quality that still fits under 1MB, so quality loss is minimized and usually invisible to the eye.',
      'seo.compress.faq.2.q': 'Does it work on huge photos from my phone?',
      'seo.compress.faq.2.a': 'Yes. Photos larger than 1920px are automatically resized before compression.',
      'seo.compress.faq.3.q': 'Is there a file size limit for uploads?',
      'seo.compress.faq.3.a': "No hard limit — processing happens on your device, so it depends on your device's memory for very large files.",
      'seo.pfp.heading': 'About this profile picture maker',
      'seo.pfp.intro': "Turn any photo into a clean, circular profile picture with a transparent background. Drag to reposition and pinch or scroll to zoom until it's framed exactly how you want it.",
      'seo.pfp.howto.1': 'Upload a photo.',
      'seo.pfp.howto.2': 'Drag and zoom inside the circle to frame your face or subject.',
      'seo.pfp.howto.3': 'Click Download PNG.',
      'seo.pfp.faqHeading': 'Frequently asked questions',
      'seo.pfp.faq.1.q': 'Can I choose which part of the photo shows?',
      'seo.pfp.faq.1.a': "Yes — drag the image inside the circle and pinch or scroll to zoom, exactly like a mobile app's profile picture picker.",
      'seo.pfp.faq.2.q': 'What format is the download?',
      'seo.pfp.faq.2.a': 'A PNG file with a transparent background outside the circle.',
      'seo.pfp.faq.3.q': 'Does this upload my photo anywhere?',
      'seo.pfp.faq.3.a': 'No, the entire crop and render happens locally in your browser.',
      'seo.youtube.heading': 'About this YouTube thumbnail downloader',
      'seo.youtube.intro': "Download any YouTube video's thumbnail in the highest quality available, straight to your device. Just paste the video link — no software, no account needed.",
      'seo.youtube.howto.1': 'Paste a YouTube video URL.',
      'seo.youtube.howto.2': 'The tool fetches every available thumbnail quality.',
      'seo.youtube.howto.3': 'Click download on the resolution you want.',
      'seo.youtube.faqHeading': 'Frequently asked questions',
      'seo.youtube.faq.1.q': 'Is this legal to use?',
      'seo.youtube.faq.1.a': 'Downloading a thumbnail for personal reference, backup, or discussion is generally fine; always respect copyright if you plan to republish it.',
      'seo.youtube.faq.2.q': 'What qualities are available?',
      'seo.youtube.faq.2.a': 'From the small default thumbnail up to the maximum resolution the video has, often 1280×720 or higher.',
      'seo.youtube.faq.3.q': 'Does it work for private videos?',
      'seo.youtube.faq.3.a': 'No, only thumbnails for public or unlisted videos can be fetched.',
      'seo.pdf.heading': 'About this image to PDF converter',
      'seo.pdf.intro': 'Combine multiple images into a single PDF file, right in your browser. Reorder pages, choose orientation, and download — all without installing anything.',
      'seo.pdf.howto.1': 'Upload one or more images.',
      'seo.pdf.howto.2': 'Arrange the order and pick portrait or landscape.',
      'seo.pdf.howto.3': 'Click Create PDF and download.',
      'seo.pdf.faqHeading': 'Frequently asked questions',
      'seo.pdf.faq.1.q': 'How many images can I add?',
      'seo.pdf.faq.1.a': "As many as your device's memory can handle — there's no artificial limit set by the tool.",
      'seo.pdf.faq.2.q': 'Can I reorder the pages?',
      'seo.pdf.faq.2.a': 'Yes, arrange your images in whatever order you want before creating the PDF.',
      'seo.pdf.faq.3.q': 'Is the PDF password-protected?',
      'seo.pdf.faq.3.a': "No, it's a standard PDF file with no restrictions or passwords.",
      'page.updated': 'Last updated: January 2026',
      'page.about.title': 'About Us',
      'about.p1.h': 'What is MonoTools?',
      'about.p1': 'MonoTools is a small collection of free, browser-based image tools: a QR code generator, an AI background remover, an image compressor, a profile picture maker, a YouTube thumbnail downloader, and an image-to-PDF converter. Every tool runs entirely inside your browser using JavaScript and the Canvas API — nothing you upload is ever sent to a server.',
      'about.p2.h': 'Why we built it',
      'about.p2': "Most online image tools ask you to upload your photos to a server, which means your files pass through someone else's infrastructure before you get a result. We wanted the opposite: fast, free tools that respect your privacy by design — your images never leave your device, whether you're on Wi-Fi or offline.",
      'about.p3.h': 'Design philosophy',
      'about.p3': "The entire site follows one visual rule: pure black ink on white, no color, no gradients. It's a deliberate choice to keep the interface calm, fast-loading, and focused on the tools themselves rather than decoration.",
      'page.contact.title': 'Contact Us',
      'contact.p1.h': 'Get in touch',
      'contact.p1': "Have a question, found a bug, or want to suggest a new tool? We'd like to hear from you. The best way to reach us is by email:",
      'contact.p2.h': 'Response time',
      'contact.p2': "We're a small independent project, so please allow a few days for a reply. We read every message.",
      'page.privacy-policy.title': 'Privacy Policy',
      'privacy.p1.h': 'Overview',
      'privacy.p1': 'MonoTools ("we", "the site") provides free, browser-based image tools. This policy explains what information is and is not collected when you use the site.',
      'privacy.p2.h': 'Your files are never uploaded',
      'privacy.p2': "Every tool on this site (QR generator, background remover, image compressor, profile picture maker, image-to-PDF) processes your files entirely on your own device using your browser's built-in capabilities. Your images, PDFs, and QR code content are never transmitted to our servers or any third party.",
      'privacy.p3.h': 'Local storage',
      'privacy.p3': "We use your browser's local storage only to remember your language preference (English or Arabic) between visits. This stays on your device and is never sent anywhere.",
      'privacy.p4.h': 'Third-party services (YouTube thumbnails)',
      'privacy.p4': "The YouTube Thumbnail Downloader tool fetches publicly available thumbnail images directly from YouTube's own servers based on the video link you paste. This request goes directly from your browser to YouTube, not through us.",
      'privacy.p5.h': 'Cookies and advertising',
      'privacy.p5': "This site may display advertisements served by Google AdSense and other third-party advertising networks. These networks may use cookies and similar technologies to serve ads based on your prior visits to this and other websites. You can learn more about how Google uses data and manage your ad personalization preferences at Google's Ads Settings page.",
      'privacy.p6.h': "Children's privacy",
      'privacy.p6': 'This site is not directed at children under 13, and we do not knowingly collect personal information from children.',
      'privacy.p7.h': 'Changes to this policy',
      'privacy.p7': 'We may update this policy from time to time. Changes will be posted on this page with an updated date.',
      'privacy.p8.h': 'Contact us',
      'privacy.p8': 'If you have questions about this privacy policy, please contact us at the email listed on our Contact page.',
      'page.terms.title': 'Terms of Use',
      'terms.p1.h': 'Acceptance of terms',
      'terms.p1': 'By using MonoTools, you agree to these terms of use. If you do not agree, please do not use the site.',
      'terms.p2.h': 'Description of service',
      'terms.p2': 'MonoTools provides free, browser-based image and utility tools, including a QR code generator, background remover, image compressor, profile picture maker, YouTube thumbnail downloader, and image-to-PDF converter. All processing happens locally in your browser.',
      'terms.p3.h': 'Acceptable use',
      'terms.p3': "You agree not to use these tools to process content that is illegal, infringes on someone else's copyright or privacy, or violates the terms of service of any third party (including YouTube, for the thumbnail downloader).",
      'terms.p4.h': '"As is" service, no warranty',
      'terms.p4': 'This site and its tools are provided "as is" without any warranty of any kind. We do not guarantee the tools will be error-free, uninterrupted, or fit for any particular purpose.',
      'terms.p5.h': 'Limitation of liability',
      'terms.p5': 'To the fullest extent permitted by law, MonoTools and its operators are not liable for any damages arising from your use of, or inability to use, this site or its tools.',
      'terms.p6.h': 'Advertising',
      'terms.p6': 'This site may display third-party advertisements (such as Google AdSense) to support the cost of running the service. We are not responsible for the content of third-party ads.',
      'terms.p7.h': 'Changes to these terms',
      'terms.p7': 'We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.',
      'seo.wordCounter.heading': 'About this word counter',
      'seo.wordCounter.intro': 'This tool counts words, characters, sentences, and paragraphs as you type, and estimates how long the text takes to read or speak aloud — entirely in your browser, with nothing sent to a server.',
      'seo.wordCounter.howto.1': 'Paste or type your text into the box.',
      'seo.wordCounter.howto.2': 'Watch the statistics and keyword density update instantly.',
      'seo.wordCounter.faqHeading': 'Frequently asked questions',
      'seo.wordCounter.faq.1.q': 'Is there a limit on how much text I can paste?',
      'seo.wordCounter.faq.1.a': 'No practical limit — the tool runs entirely in your browser, so it depends only on your device.',
      'seo.wordCounter.faq.2.q': 'How is reading time calculated?',
      'seo.wordCounter.faq.2.a': 'Based on an average adult reading speed of about 200 words per minute, and speaking time at about 130 words per minute.',
      'seo.wordCounter.faq.3.q': 'Does this tool support Arabic text?',
      'seo.wordCounter.faq.3.a': 'Yes, the counter and the keyword-density analysis both fully support Arabic as well as English.',
      'seo.passwordGenerator.heading': 'About this password generator',
      'seo.passwordGenerator.intro': "Generate a strong, unpredictable password using your browser's built-in secure random number generator. The password is created entirely on your device and is never transmitted anywhere.",
      'seo.passwordGenerator.howto.1': 'Choose the desired length and character types.',
      'seo.passwordGenerator.howto.2': 'Click "Generate Password".',
      'seo.passwordGenerator.howto.3': 'Copy the result with one click.',
      'seo.passwordGenerator.faqHeading': 'Frequently asked questions',
      'seo.passwordGenerator.faq.1.q': 'Are these passwords stored anywhere?',
      'seo.passwordGenerator.faq.1.a': 'No. Each password is generated locally in your browser and disappears once you leave or refresh the page.',
      'seo.passwordGenerator.faq.2.q': 'What makes a password strong?',
      'seo.passwordGenerator.faq.2.a': 'Length matters most, followed by mixing uppercase, lowercase, numbers, and symbols. Aim for at least 12–16 characters.',
      'seo.passwordGenerator.faq.3.q': 'Can I use this for banking or work passwords?',
      'seo.passwordGenerator.faq.3.a': 'Yes — the generation happens entirely offline in your browser, so it is as private as generating one on paper.',
      'seo.caseConverter.heading': 'About this case converter',
      'seo.caseConverter.intro': 'Convert any block of text between uppercase, lowercase, title case, sentence case, and alternating case with a single click — all processed locally in your browser.',
      'seo.caseConverter.howto.1': 'Paste your text into the box.',
      'seo.caseConverter.howto.2': 'Click the case style you want.',
      'seo.caseConverter.faqHeading': 'Frequently asked questions',
      'seo.caseConverter.faq.1.q': 'What is "Title Case" used for?',
      'seo.caseConverter.faq.1.a': 'It capitalizes the first letter of each major word — commonly used for headlines and article titles.',
      'seo.caseConverter.faq.2.q': 'Does it work with Arabic text?',
      'seo.caseConverter.faq.2.a': 'Case conversion applies to Latin letters; Arabic script does not have uppercase/lowercase distinctions, so Arabic text passes through unchanged.',
      'seo.caseConverter.faq.3.q': 'Is my text saved anywhere?',
      'seo.caseConverter.faq.3.a': 'No, everything happens locally in your browser and nothing is uploaded.',
      'seo.dedupe.heading': 'About this duplicate line remover',
      'seo.dedupe.intro': 'Paste any list — emails, keywords, links, or names — and this tool removes every duplicate line while keeping the first occurrence and the original order intact.',
      'seo.dedupe.howto.1': 'Paste your list, one item per line.',
      'seo.dedupe.howto.2': 'Choose whether to ignore extra spaces.',
      'seo.dedupe.howto.3': 'Click "Remove Duplicates" and copy the result.',
      'seo.dedupe.faqHeading': 'Frequently asked questions',
      'seo.dedupe.faq.1.q': 'Does it change the order of the remaining lines?',
      'seo.dedupe.faq.1.a': 'No, the original order is always preserved — only later duplicates are removed.',
      'seo.dedupe.faq.2.q': 'Are empty lines treated as duplicates?',
      'seo.dedupe.faq.2.a': 'When "ignore extra spaces" is enabled, blank or whitespace-only lines are removed entirely.',
      'seo.dedupe.faq.3.q': 'Is this case-sensitive?',
      'seo.dedupe.faq.3.a': 'Yes, lines that differ only in letter case are treated as different lines.',
      'seo.textDiff.heading': 'About this text diff checker',
      'seo.textDiff.intro': 'Paste two versions of a text and this tool highlights every line that was added or removed between them, making it easy to spot exactly what changed.',
      'seo.textDiff.howto.1': 'Paste the original text on the left.',
      'seo.textDiff.howto.2': 'Paste the modified text on the right.',
      'seo.textDiff.howto.3': 'Click "Compare" to see the differences highlighted.',
      'seo.textDiff.faqHeading': 'Frequently asked questions',
      'seo.textDiff.faq.1.q': 'Does it compare word by word or line by line?',
      'seo.textDiff.faq.1.a': 'This tool compares line by line, which is the most common and readable way to review changes in text or code.',
      'seo.textDiff.faq.2.q': 'Is there a size limit?',
      'seo.textDiff.faq.2.a': 'Yes, up to 600 lines per side, to keep the comparison fast and responsive in your browser.',
      'seo.textDiff.faq.3.q': 'Is my text uploaded anywhere?',
      'seo.textDiff.faq.3.a': 'No, the entire comparison runs locally in your browser.',
      'seo.loremIpsum.heading': 'About this Lorem Ipsum generator',
      'seo.loremIpsum.intro': 'Generate any number of classic Lorem Ipsum placeholder paragraphs, useful for filling in mockups, wireframes, and page layouts before real content is ready.',
      'seo.loremIpsum.howto.1': 'Choose how many paragraphs you need.',
      'seo.loremIpsum.howto.2': 'Click "Generate Text" and copy the result.',
      'seo.loremIpsum.faqHeading': 'Frequently asked questions',
      'seo.loremIpsum.faq.1.q': 'What is Lorem Ipsum?',
      'seo.loremIpsum.faq.1.a': 'It is standard placeholder text used in the printing and design industries since the 16th century, chosen because it looks like readable Latin without carrying real meaning.',
      'seo.loremIpsum.faq.2.q': 'Why use placeholder text instead of real content?',
      'seo.loremIpsum.faq.2.a': 'It lets designers focus on layout and typography without being distracted — or delayed — by unfinished real content.',
      'seo.loremIpsum.faq.3.q': 'Can I generate more than 20 paragraphs?',
      'seo.loremIpsum.faq.3.a': 'The tool caps at 20 paragraphs per generation to keep the output easy to work with — you can generate again for more.',
      'seo.slugGenerator.heading': 'About this URL slug generator',
      'seo.slugGenerator.intro': 'Turn any title or phrase into a clean, lowercase, hyphen-separated URL slug — the kind search engines and content management systems expect — instantly as you type.',
      'seo.slugGenerator.howto.1': 'Type or paste your title.',
      'seo.slugGenerator.howto.2': 'Copy the generated slug instantly.',
      'seo.slugGenerator.faqHeading': 'Frequently asked questions',
      'seo.slugGenerator.faq.1.q': 'What is a URL slug?',
      'seo.slugGenerator.faq.1.a': 'It is the readable part of a web address that identifies a specific page, such as "my-article-title" in a blog URL.',
      'seo.slugGenerator.faq.2.q': 'Why are slugs important for SEO?',
      'seo.slugGenerator.faq.2.a': 'Clean, descriptive slugs are easier for both search engines and readers to understand than long strings of random characters.',
      'seo.slugGenerator.faq.3.q': 'Does it support Arabic titles?',
      'seo.slugGenerator.faq.3.a': 'Yes, Arabic letters are preserved in the slug alongside standard hyphen separators.',

      'seo.jsonFormatter.heading': 'About this JSON formatter', 'seo.jsonFormatter.faqHeading': 'Frequently asked questions',
      'seo.jsonFormatter.intro': 'Paste any JSON data to format it with clear indentation and color-coded syntax highlighting, or instantly spot exactly where a syntax error is located. Everything runs locally in your browser.',
      'seo.jsonFormatter.howto.1': 'Paste your JSON data into the box.',
      'seo.jsonFormatter.howto.2': 'Click "Format" for readable indentation, or "Minify" to compact it.',
      'seo.jsonFormatter.faq.1.q': 'What happens if my JSON has an error?',
      'seo.jsonFormatter.faq.1.a': 'The tool shows a clear error message describing what is wrong and roughly where it occurs, so you can fix it quickly.',
      'seo.jsonFormatter.faq.2.q': 'What is the difference between "Format" and "Minify"?',
      'seo.jsonFormatter.faq.2.a': '"Format" adds indentation and line breaks for readability, while "Minify" removes all unnecessary whitespace to produce the smallest possible file size.',
      'seo.jsonFormatter.faq.3.q': 'Is my data uploaded anywhere?',
      'seo.jsonFormatter.faq.3.a': 'No, all parsing and formatting happens locally in your browser — nothing is sent to a server.',

      'seo.colorConverter.heading': 'About this color converter', 'seo.colorConverter.faqHeading': 'Frequently asked questions',
      'seo.colorConverter.intro': 'Enter a color in any common format — HEX, RGB, or HSL — and instantly see it converted to the other two formats, along with a live preview swatch.',
      'seo.colorConverter.howto.1': 'Type or paste a color value, or use the color picker.',
      'seo.colorConverter.howto.2': 'Read the converted HEX, RGB, and HSL values instantly.',
      'seo.colorConverter.faq.1.q': 'Which color formats are supported?',
      'seo.colorConverter.faq.1.a': 'HEX (3 or 6 digits), RGB, and HSL are all supported as input, and all three are always shown as output.',
      'seo.colorConverter.faq.2.q': 'What is the difference between RGB and HSL?',
      'seo.colorConverter.faq.2.a': 'RGB defines a color by its red, green, and blue intensity, while HSL defines it by hue, saturation, and lightness — often more intuitive for adjusting a color\'s shade.',
      'seo.colorConverter.faq.3.q': 'Can I use the native color picker instead of typing?',
      'seo.colorConverter.faq.3.a': 'Yes, clicking the color swatch opens your browser\'s built-in color picker, which stays in sync with the text field.',
      'lang.ar': 'العربية', 'lang.en': 'English',
    },
    ar: {
      'nav.home': 'الرئيسية', 'nav.qr': 'صانع QR', 'nav.bg': 'إزالة الخلفية',
      'nav.compress': 'ضغط الصور', 'nav.pfp': 'صانع صور البروفايل', 'nav.youtube': 'صور يوتيوب', 'nav.pdf': 'صور إلى PDF',
      'nav.wordCounter': 'عداد الكلمات', 'nav.passwordGenerator': 'مولّد كلمات المرور', 'nav.caseConverter': 'محوّل حالة الأحرف',
      'nav.dedupe': 'إزالة الأسطر المكرّرة', 'nav.textDiff': 'مقارنة النصوص', 'nav.loremIpsum': 'مولّد النص التجريبي',
      'nav.slugGenerator': 'مولّد رابط URL', 'nav.jsonFormatter': 'منسّق JSON', 'nav.colorConverter': 'محوّل الألوان',
      'hero.title': 'أدوات مجانية، مباشرة من متصفحك',
      'hero.sub': 'خمس عشرة أداة سريعة ومجانية تعمل بالكامل في متصفحك. دون رفع أو تسجيل — بياناتك لا تغادر جهازك أبدًا.',
      'card.qr.title': 'صانع رمز QR', 'card.qr.desc': 'توليد رمز QR فوري في المتصفح. مربع، عالي الدقة، قابل للتحميل كـ PNG.',
      'card.bg.title': 'إزالة خلفية الصور', 'card.bg.desc': 'إزالة خلفية الصور بالذكاء الاصطناعي على جهازك. صدّر PNG شفاف فوراً.',
      'card.compress.title': 'ضغط الصور', 'card.compress.desc': 'اضغط الصور مباشرة في متصفحك تلقائياً وبأفضل جودة ممكنة.',
      'card.pfp.title': 'صانع صور البروفايل', 'card.pfp.desc': 'حوّل أي صورة إلى صورة بروفايل دائرية نظيفة بخلفية شفافة. اسحب وقرّب لتأطيرها تمامًا كما تريد.',
      'card.yt.title': 'تحميل صور يوتيوب', 'card.yt.desc': 'تحميل أي صورة مصغرة من فيديو يوتيوب بأعلى دقة متوفرة، بضغطة واحدة.',
      'card.pdf.title': 'صور إلى PDF', 'card.pdf.desc': 'تحويل عدة صور إلى ملف PDF واحد مباشرة في متصفحك. سريع وآمن.',
      'card.wordCounter.title': 'عداد الكلمات', 'card.wordCounter.desc': 'إحصاء الكلمات والأحرف والجمل وتقدير زمن القراءة، مع تحليل لكثافة الكلمات المفتاحية.',
      'card.passwordGenerator.title': 'مولّد كلمات المرور', 'card.passwordGenerator.desc': 'إنشاء كلمات مرور قوية وعشوائية مع تحكم كامل في الطول وأنواع الأحرف.',
      'card.caseConverter.title': 'محوّل حالة الأحرف', 'card.caseConverter.desc': 'تحويل النص فورًا إلى أحرف كبيرة أو صغيرة أو حالة العنوان أو حالة الجملة.',
      'card.dedupe.title': 'إزالة الأسطر المكرّرة', 'card.dedupe.desc': 'تنقية قائمة نصية من الأسطر المكرّرة مع الحفاظ على الترتيب الأصلي.',
      'card.textDiff.title': 'مقارنة النصوص', 'card.textDiff.desc': 'مقارنة نصّين واكتشاف كل سطر أُضيف أو حُذف بينهما فورًا.',
      'card.loremIpsum.title': 'مولّد النص التجريبي', 'card.loremIpsum.desc': 'إنشاء فقرات نصية بديلة من نص Lorem Ipsum الكلاسيكي لتصاميم النماذج الأولية.',
      'card.slugGenerator.title': 'مولّد رابط URL', 'card.slugGenerator.desc': 'تحويل أي عنوان إلى رابط نظيف وملائم لمحركات البحث تلقائيًا.',
      'card.jsonFormatter.title': 'منسّق JSON', 'card.jsonFormatter.desc': 'تنسيق بيانات JSON والتحقق من صحتها مع تلوين الكود، وتحديد أي خطأ في الصياغة بوضوح.',
      'card.colorConverter.title': 'محوّل الألوان', 'card.colorConverter.desc': 'حوّل فورًا بين أكواد الألوان HEX وRGB وHSL، مع معاينة حية للون.',
      'card.cta': 'افتح الأداة ←',
      'trust': 'خصوصية 100%: تتم معالجة جميع الملفات محلياً على جهازك',
      'feat.free': 'مجاني تماماً', 'feat.instant': 'نتائج فورية',
      'feat.private': 'خصوصية كاملة', 'feat.nosignup': 'بدون تسجيل',
      'ad.top': 'مساحة إعلانية — أعلى', 'ad.bottom': 'مساحة إعلانية — أسفل',
      'back': 'رجوع',
      'processing': 'جارٍ المعالجة…',
      'qr.title': 'صانع رمز QR',
      'qr.desc': 'أنشئ رمز QR فورياً في متصفحك. اكتب نصاً أو رابطاً، اختر مستوى تصحيح الأخطاء، ثم حمّل.',
      'qr.content': 'المحتوى (رابط)', 'qr.contentPh': 'الصق رابط (URL)...',
      'qr.size': 'حجم الصورة', 'qr.ecc': 'تصحيح الأخطاء', 'qr.generate': 'توليد QR', 'qr.download': 'تحميل PNG',
      'qr.empty': 'سيظهر رمز الـ QR هنا', 'qr.errEmpty': 'الرجاء إدخال محتوى لإنشاء رمز QR.',
      'bg.title': 'إزالة خلفية الصور',
      'bg.desc': 'إزالة خلفية الصور بالذكاء الاصطناعي على جهازك (RMBG-1.4). يُحمّل النموذج مرة واحدة عند أول استخدام، ثم يعمل بالكامل في متصفحك. صدّر PNG شفاف.',
      'bg.loading': 'جارٍ تحميل محرك الذكاء… (أول استخدام فقط)', 'bg.model': 'جارٍ تنزيل نموذج الذكاء الاصطناعي…',
      'bg.processing': 'جارٍ إزالة الخلفية…', 'bg.done': 'تمت إزالة الخلفية',
      'bg.disclaimer': 'يرجى العلم: تتم معالجة الصورة محلياً بالكامل داخل متصفحك دون رفعها لأي خوادم خارجية، مما يضمن خصوصيتك بنسبة 100%. قد تستغرق العملية من دقيقة إلى دقيقتين حسب سرعة جهازك. ولأننا نستخدم نموذج ذكاء اصطناعي خفيف (Lite Model) لضمان استقرار متصفحك، قد لا تكون النتائج دقيقة تماماً في حال كانت خلفية الصورة شديدة التعقيد أو الألوان متداخلة جداً.',
      'bg.download': 'تحميل PNG', 'bg.errFail': 'فشلت إزالة الخلفية. جرّب صورة أخرى.',
      'compress.title': 'ضغط الصور',
      'compress.desc': 'اضغط أي صورة مباشرة في متصفحك باستخدام Canvas API — تُصغّر الصور الضخمة تلقائيًا وتحدّد أعلى جودة ممكنة تجعل حجم الملف أقل من 1 ميجابايت. تعمل الأداة بالكامل على جهازك.',
      'compress.originalSize': 'الحجم الأصلي', 'compress.compressedSize': 'الحجم بعد الضغط',
      'compress.download': 'تحميل JPG', 'compress.errFail': 'فشل ضغط الصورة. جرّب صورة أخرى.',
      'pfp.title': 'صانع صور البروفايل',
      'pfp.desc': 'اقتطع صورتك في دائرة نظيفة بخلفية شفافة. اسحب لتحديد المكان، وقرّب أو بعّد باستخدام إيماءة القرص أو عجلة الماوس. تعمل الأداة بالكامل على جهازك.',
      'pfp.hint': 'اسحب لتحديد المكان. قرّب أو بعّد باستخدام إيماءة القرص أو عجلة الماوس.',
      'pfp.download': 'تحميل PNG', 'pfp.errFail': 'تعذّرت معالجة هذه الصورة. جرّب صورة أخرى.',
      'yt.title': 'تحميل صور يوتيوب المصغرة',
      'yt.desc': 'ألصق رابط فيديو يوتيوب لعرض جميع الصور المصغرة المتوفرة بكل الجودات، ثم حمّل أي منها بضغطة واحدة.',
      'yt.urlPh': 'https://www.youtube.com/watch?v=...', 'yt.fetch': 'بحث',
      'yt.errEmpty': 'الرجاء إدخال رابط يوتيوب.', 'yt.errInvalid': 'تعذّر العثور على معرّف فيديو يوتيوب في هذا الرابط.',
      'yt.searching': 'جارٍ البحث عن الصور المصغرة…', 'yt.unavailable': 'غير متوفرة لهذا الفيديو',
      'yt.download': 'تحميل', 'yt.bytes': 'بايت', 'yt.openDirect': 'فتح الصورة (احفظ يدوياً)',
      'pdf.title': 'تحويل الصور إلى PDF',
      'pdf.desc': 'اختر صورة أو أكثر، رتّبها، ثم حوّلها إلى ملف PDF واحد في متصفحك. سريع وآمن — لا يُرفع شيء.',
      'pdf.drop': 'اسحب الصور هنا أو اضغط للاختيار (متعدد مسموح)',
      'pdf.portrait': 'طولي', 'pdf.landscape': 'عرضي', 'pdf.pageSize': 'حجم الصفحة',
      'pdf.convert': 'تحويل إلى PDF', 'pdf.processing': 'جارٍ إنشاء PDF…', 'pdf.download': 'تحميل PDF',
      'pdf.images': 'الصور', 'pdf.size': 'الحجم', 'pdf.orient': 'الاتجاه',
      'pdf.errEmpty': 'أضف صورة واحدة على الأقل أولاً.', 'pdf.remove': 'حذف',
      'copied': 'تم النسخ إلى الحافظة', 'unit.min': 'دقيقة', 'unit.sec': 'ثانية', 'btn.copy': 'نسخ', 'btn.clear': 'مسح',

      'wc.title': 'عداد الكلمات', 'wc.desc': 'الصق النص أو اكتبه أدناه لعرض إحصائيات فورية تشمل عدد الكلمات وعدد الأحرف وتقدير زمن القراءة.',
      'wc.placeholder': 'ابدأ الكتابة أو الصق النص هنا…',
      'wc.words': 'الكلمات', 'wc.chars': 'الأحرف', 'wc.charsNoSpace': 'الأحرف (بدون مسافات)', 'wc.sentences': 'الجمل',
      'wc.paragraphs': 'الفقرات', 'wc.readingTime': 'زمن القراءة', 'wc.speakingTime': 'زمن الإلقاء', 'wc.keywordDensity': 'كثافة الكلمات المفتاحية (أعلى 5)',

      'pg.title': 'مولّد كلمات المرور', 'pg.desc': 'إنشاء كلمة مرور قوية وعشوائية محليًا داخل متصفحك، دون إرسال أي بيانات لأي خادم.',
      'pg.length': 'الطول', 'pg.upper': 'أحرف كبيرة (A-Z)', 'pg.lower': 'أحرف صغيرة (a-z)', 'pg.nums': 'أرقام (0-9)', 'pg.syms': 'رموز (!@#$…)',
      'pg.generate': 'توليد كلمة المرور', 'pg.strength': 'قوة كلمة المرور', 'pg.weak': 'ضعيفة', 'pg.medium': 'متوسطة', 'pg.strong': 'قوية',
      'pg.noneSelected': 'يرجى اختيار نوع واحد على الأقل من الأحرف.',

      'cc.title': 'محوّل حالة الأحرف', 'cc.desc': 'الصق النص وحوّله فورًا إلى أي حالة أحرف تريدها.',
      'cc.placeholder': 'اكتب النص أو الصقه هنا…', 'cc.upper': 'أحرف كبيرة', 'cc.lower': 'أحرف صغيرة', 'cc.titleCase': 'حالة العنوان',
      'cc.sentenceCase': 'حالة الجملة', 'cc.altCase': 'حالة متبادلة', 'cc.result': 'النتيجة',

      'dd.title': 'إزالة الأسطر المكرّرة', 'dd.desc': 'الصق قائمة من الأسطر وأزل المكرر منها فورًا مع الحفاظ على الترتيب الأصلي.',
      'dd.placeholder': 'الصق القائمة هنا، عنصر واحد في كل سطر…', 'dd.trim': 'تجاهل المسافات الزائدة في بداية السطر ونهايته', 'dd.run': 'إزالة التكرار',
      'dd.linesIn': 'الأسطر قبل المعالجة', 'dd.linesOut': 'الأسطر بعد المعالجة', 'dd.removed': 'الأسطر المحذوفة', 'dd.result': 'النتيجة',

      'df.title': 'مقارنة النصوص', 'df.desc': 'قارن نصّين سطرًا بسطر واكتشف بدقة كل ما تغيّر بينهما.',
      'df.original': 'النص الأصلي', 'df.modified': 'النص المعدَّل', 'df.originalPh': 'الصق النص الأصلي هنا…', 'df.modifiedPh': 'الصق النص المعدَّل هنا…',
      'df.compare': 'مقارنة', 'df.identical': 'النصّان متطابقان تمامًا.', 'df.tooLarge': 'النص طويل جدًا للمقارنة (بحد أقصى 600 سطر لكل جانب).',

      'li.title': 'مولّد النص التجريبي', 'li.desc': 'إنشاء فقرات نصية بديلة من نص Lorem Ipsum الكلاسيكي لاستخدامها في تصاميم النماذج الأولية.',
      'li.count': 'عدد الفقرات', 'li.generate': 'توليد النص',

      'sg.title': 'مولّد رابط URL', 'sg.desc': 'حوّل أي عنوان أو عبارة إلى رابط نظيف وملائم لمحركات البحث تلقائيًا أثناء الكتابة.',
      'sg.inputLabel': 'العنوان أو العبارة', 'sg.placeholder': 'مثال: مقالتي الرائعة في المدونة!', 'sg.empty': 'سيظهر الرابط الناتج هنا…', 'sg.result': 'الرابط الناتج',

      'jf.title': 'منسّق JSON والتحقق من صحته', 'jf.desc': 'الصق بيانات JSON لتنسيقها مع تلوين الكود، أو لاكتشاف الأخطاء وتحديد موقعها فورًا.',
      'jf.placeholder': 'الصق بيانات JSON هنا…', 'jf.format': 'تنسيق', 'jf.minify': 'ضغط',
      'jf.errInvalid': 'صيغة JSON غير صحيحة',

      'cv.title': 'محوّل الألوان', 'cv.desc': 'حوّل فورًا بين أكواد الألوان HEX وRGB وHSL، مع معاينة حية للون.',
      'cv.inputLabel': 'قيمة اللون', 'cv.placeholder': 'مثال: #6366f1 أو rgb(99,102,241) أو hsl(239,84%,67%)',
      'cv.errInvalid': 'تعذّر التعرّف على صيغة اللون هذه.',

      'upload.drop': 'اسحب الصورة هنا أو اضغط للاختيار',
      'upload.sub': 'PNG · JPG · WEBP · BMP — معالجة محلية',
      'footer.tag': 'أدوات صور مينيمالية',
      'footer.dev': 'تطوير', 'footer.copy': 'جميع الحقوق محفوظة',
      'footer.privacy': 'سياسة الخصوصية', 'footer.terms': 'شروط الاستخدام',
      'cookie.msg': 'قد يستخدم هذا الموقع ملفات تعريف الارتباط (كوكيز) للإعلانات والتحليلات الأساسية. باستمرارك في استخدامه، فإنك توافق على',
      'cookie.privacyLink': 'سياسة الخصوصية', 'cookie.accept': 'فهمت',
      'footer.about': 'من نحن', 'footer.contact': 'تواصل معنا',
      'seo.qr.heading': 'عن مولّد أكواد QR هذا',
      'seo.qr.intro': 'أنشئ رمز QR من أي رابط في ثوانٍ. تتم كل العمليات داخل متصفحك — دون إرسال أي بيانات إلى أي خادم، فيبقى رمز الـ QR الخاص بك خاصًا تمامًا.',
      'seo.qr.howto.1': 'اكتب أو الصق النص أو الرابط الذي تريد تحويله.',
      'seo.qr.howto.2': 'اختر مستوى تصحيح الأخطاء والمقاس الذي يناسبك.',
      'seo.qr.howto.3': 'دوس "توليد" وحمّل الصورة PNG.',
      'seo.qr.faqHeading': 'أسئلة شائعة',
      'seo.qr.faq.1.q': 'هل أحتاج إلى حساب لإنشاء رمز QR؟',
      'seo.qr.faq.1.a': 'لا، تعمل الأداة فورًا دون تسجيل ودون حد أقصى لعدد الأكواد.',
      'seo.qr.faq.2.q': 'هل ينتهي صلاحية هذا الكود؟',
      'seo.qr.faq.2.a': 'لا، فهي صورة ثابتة يبقى محتواك مضمَّنًا فيها للأبد، وتعمل حتى دون اتصال بالإنترنت.',
      'seo.qr.faq.3.q': 'ماذا يمكنني أن أضع داخل رمز الـ QR؟',
      'seo.qr.faq.3.a': 'رابط (URL) — زي رابط موقع، صفحة سوشيال ميديا، أو رابط فيديو.',
      'seo.bg.heading': 'عن أداة إزالة الخلفية هذه',
      'seo.bg.intro': 'أزل خلفية أي صورة تلقائيًا باستخدام نموذج ذكاء اصطناعي يعمل بالكامل على جهازك. لا تُرفع الصورة إلى أي خادم إطلاقًا — تتم كل عمليات المعالجة داخل متصفحك، ثم تُنزّل صورة PNG بخلفية شفافة.',
      'seo.bg.howto.1': 'ارفع الصورة.',
      'seo.bg.howto.2': 'انتظر بضع ثوانٍ حتى يحدّد الذكاء الاصطناعي المحلي عناصر الصورة.',
      'seo.bg.howto.3': 'حمّل الصورة الشفافة PNG.',
      'seo.bg.faqHeading': 'أسئلة شائعة',
      'seo.bg.faq.1.q': 'هل تُرفع صورتي إلى خادم؟',
      'seo.bg.faq.1.a': 'لا، يُحمَّل النموذج مرة واحدة على متصفحك، وتتم كل عمليات المعالجة على جهازك.',
      'seo.bg.faq.2.q': 'لماذا تظهر بعض الحواف غير دقيقة أحيانًا؟',
      'seo.bg.faq.2.a': 'قد تُربك الخلفيات المعقدة أو الألوان المتقاربة أي أداة ذكاء اصطناعي حتى المدفوعة منها. جرّب صورة ذات تباين أوضح بين الموضوع والخلفية.',
      'seo.bg.faq.3.q': 'بأي صيغة سيتم تصدير النتيجة؟',
      'seo.bg.faq.3.a': 'ملف PNG بخلفية شفافة، جاهز لاستخدامه في أي غرض.',
      'seo.compress.heading': 'عن أداة ضغط الصور هذه',
      'seo.compress.intro': 'قلّل حجم الصور الكبيرة لأقل من 1 ميجابايت تلقائياً، مع الحفاظ على أعلى جودة بصرية ممكنة. الأداة بتصغّر الصور الضخمة وتظبط جودة JPEG بنفسها — من غير أشرطة تحكم ومن غير تخمين.',
      'seo.compress.howto.1': 'ارفع الصورة.',
      'seo.compress.howto.2': 'تقوم الأداة بتصغيرها وضغطها تلقائيًا.',
      'seo.compress.howto.3': 'حمّل ملف الـ JPG المضغوط.',
      'seo.compress.faqHeading': 'أسئلة شائعة',
      'seo.compress.faq.1.q': 'هل ستقل جودة صورتي؟',
      'seo.compress.faq.1.a': 'تبحث الأداة دائمًا عن أعلى جودة تجعل الحجم أقل من 1 ميجابايت، لذا يكون أي فقدان في الجودة غير محسوس تقريبًا للعين.',
      'seo.compress.faq.2.q': 'هل تعمل الأداة مع الصور الكبيرة الملتقطة بالهاتف؟',
      'seo.compress.faq.2.a': 'نعم، تُصغَّر أي صورة أكبر من 1920 بكسل تلقائيًا قبل الضغط.',
      'seo.compress.faq.3.q': 'فيه حد أقصى لحجم الرفع؟',
      'seo.compress.faq.3.a': 'لا يوجد حد ثابت — تتم المعالجة على جهازك، فالأمر يعتمد على ذاكرة جهازك بالنسبة للملفات الكبيرة جدًا.',
      'seo.pfp.heading': 'عن صانع صور البروفايل هذا',
      'seo.pfp.intro': 'حوّل أي صورة إلى صورة بروفايل دائرية نظيفة بخلفية شفافة. اسحب لتحديد المكان، وقرّب أو بعّد باستخدام إيماءة القرص أو عجلة الماوس، حتى تضبطها تمامًا كما تريد.',
      'seo.pfp.howto.1': 'ارفع الصورة.',
      'seo.pfp.howto.2': 'اسحب وقرّب داخل الدائرة لتأطير وجهك أو الموضوع المطلوب.',
      'seo.pfp.howto.3': 'دوس تحميل PNG.',
      'seo.pfp.faqHeading': 'أسئلة شائعة',
      'seo.pfp.faq.1.q': 'أقدر أختار أي جزء من الصورة يظهر؟',
      'seo.pfp.faq.1.a': 'نعم، اسحب الصورة داخل الدائرة وقرّب أو بعّد باستخدام إيماءة القرص أو العجلة، تمامًا كأدوات صور البروفايل في تطبيقات الهاتف.',
      'seo.pfp.faq.2.q': 'بأي صيغة سيتم التنزيل؟',
      'seo.pfp.faq.2.a': 'ملف PNG بخلفية شفافة خارج الدائرة.',
      'seo.pfp.faq.3.q': 'هل تُرفع الصورة إلى أي مكان؟',
      'seo.pfp.faq.3.a': 'لا، تتم عملية القص والمعالجة بالكامل محليًا داخل متصفحك.',
      'seo.youtube.heading': 'عن أداة تحميل صور يوتيوب هذه',
      'seo.youtube.intro': 'حمّل صورة أي فيديو يوتيوب بأعلى جودة متاحة مباشرة على جهازك. الصق رابط الفيديو فقط، دون برامج أو حساب.',
      'seo.youtube.howto.1': 'الصق رابط فيديو اليوتيوب.',
      'seo.youtube.howto.2': 'الأداة بتجيب كل جودات الصورة المتاحة.',
      'seo.youtube.howto.3': 'اضغط تحميل على الدقة التي تريدها.',
      'seo.youtube.faqHeading': 'أسئلة شائعة',
      'seo.youtube.faq.1.q': 'هل هذا قانوني؟',
      'seo.youtube.faq.1.a': 'يُعد تحميل الصورة للاستخدام الشخصي أو المرجعي مقبولاً بشكل عام؛ احترم حقوق النشر إذا كنت تنوي إعادة نشرها.',
      'seo.youtube.faq.2.q': 'ما هي الجودات المتاحة؟',
      'seo.youtube.faq.2.a': 'من الصورة الصغيرة الافتراضية لحد أعلى دقة متاحة للفيديو، غالباً 1280×720 أو أعلى.',
      'seo.youtube.faq.3.q': 'بتشتغل مع الفيديوهات الخاصة؟',
      'seo.youtube.faq.3.a': 'لا، الفيديوهات العامة أو غير المدرجة فقط.',
      'seo.pdf.heading': 'عن أداة تحويل الصور إلى PDF هذه',
      'seo.pdf.intro': 'ادمج عدة صور في ملف PDF واحد، مباشرة داخل متصفحك. رتّب الصفحات، اختر الاتجاه، وحمّل الملف — دون تثبيت أي برنامج.',
      'seo.pdf.howto.1': 'ارفع صورة أو أكتر.',
      'seo.pdf.howto.2': 'رتّب الترتيب واختار عمودي أو أفقي.',
      'seo.pdf.howto.3': 'دوس إنشاء PDF وحمّله.',
      'seo.pdf.faqHeading': 'أسئلة شائعة',
      'seo.pdf.faq.1.q': 'أقدر أضيف كام صورة؟',
      'seo.pdf.faq.1.a': 'بقدر ما تسمح به ذاكرة جهازك — لا يوجد حد أقصى تفرضه الأداة.',
      'seo.pdf.faq.2.q': 'أقدر أرتّب الصفحات؟',
      'seo.pdf.faq.2.a': 'نعم، رتّب الصور بالترتيب الذي تريده قبل إنشاء الملف.',
      'seo.pdf.faq.3.q': 'هل ملف الـ PDF محمي بكلمة مرور؟',
      'seo.pdf.faq.3.a': 'لا، إنه ملف PDF عادي دون أي قيود أو كلمة مرور.',
      'page.updated': 'آخر تحديث: يناير 2026',
      'page.about.title': 'من نحن',
      'about.p1.h': 'ما هو MonoTools؟',
      'about.p1': 'MonoTools مجموعة صغيرة من أدوات الصور المجانية العاملة بالكامل داخل المتصفح: مولّد أكواد QR، وأداة إزالة الخلفية بالذكاء الاصطناعي، وأداة ضغط الصور، وصانع صور البروفايل، وأداة تحميل صور يوتيوب المصغّرة، وأداة تحويل الصور إلى PDF. تعمل كل أداة بالكامل داخل متصفحك باستخدام JavaScript وواجهة الـ Canvas — فلا يغادر أي شيء ترفعه جهازك إطلاقًا.',
      'about.p2.h': 'لماذا أنشأنا هذا الموقع',
      'about.p2': 'تطلب معظم أدوات الصور على الإنترنت رفع صورك إلى خادم، أي أن ملفاتك تمر عبر أجهزة طرف آخر قبل الحصول على النتيجة. نريد العكس تمامًا: أدوات سريعة ومجانية تحترم خصوصيتك من الأساس — فلا تغادر صورك جهازك إطلاقًا، سواء كنت متصلاً بالإنترنت أو غير متصل.',
      'about.p3.h': 'فلسفة التصميم',
      'about.p3': 'يعتمد الموقع بأكمله على قاعدة تصميم واحدة: خط أسود نقي على أبيض، دون ألوان أو تدرجات. وهو خيار مقصود لتبقى الواجهة هادئة وسريعة التحميل، ومركّزة على الأدوات نفسها بدلاً من الزخرفة.',
      'page.contact.title': 'تواصل معنا',
      'contact.p1.h': 'تواصل معانا',
      'contact.p1': 'هل لديك سؤال، وجدت مشكلة، أو تريد اقتراح أداة جديدة؟ يسعدنا أن نسمع منك. أفضل طريقة للتواصل معنا هي البريد الإلكتروني:',
      'contact.p2.h': 'مدة الرد',
      'contact.p2': 'نحن مشروع مستقل صغير، لذا يُرجى منحنا بضعة أيام للرد. نقرأ كل رسالة تصلنا.',
      'page.privacy-policy.title': 'سياسة الخصوصية',
      'privacy.p1.h': 'نظرة عامة',
      'privacy.p1': 'يقدّم موقع MonoTools ("نحن"، "الموقع") أدوات صور مجانية تعمل داخل المتصفح. توضّح هذه السياسة المعلومات التي تُجمع وتلك التي لا تُجمع عند استخدام الموقع.',
      'privacy.p2.h': 'ملفاتك آمنة ولا تُرفع لأي خادم',
      'privacy.p2': 'تعالج كل أداة على الموقع (مولّد الـ QR، إزالة الخلفية، ضغط الصور، صانع صور البروفايل، تحويل الصور إلى PDF) ملفاتك بالكامل على جهازك باستخدام إمكانيات المتصفح. لا تُرسل صورك وملفات الـ PDF ومحتوى أكواد الـ QR إلى خوادمنا أو إلى أي طرف ثالث إطلاقًا.',
      'privacy.p3.h': 'التخزين المحلي',
      'privacy.p3': 'نستخدم التخزين المحلي في متصفحك فقط لتذكّر تفضيل اللغة الخاص بك (الإنجليزية أو العربية) بين الزيارات. تبقى هذه البيانات على جهازك ولا تُرسل إلى أي مكان.',
      'privacy.p4.h': 'خدمات طرف تالت (صور يوتيوب)',
      'privacy.p4': 'تجلب أداة تحميل صور يوتيوب المصغرة صورًا عامة مباشرة من خوادم يوتيوب نفسها بناءً على رابط الفيديو الذي تلصقه. يذهب هذا الطلب مباشرة من متصفحك إلى يوتيوب، وليس من خلالنا.',
      'privacy.p5.h': 'الكوكيز والإعلانات',
      'privacy.p5': 'قد يعرض الموقع إعلانات من Google AdSense وشبكات إعلانية أخرى. قد تستخدم هذه الشبكات ملفات تعريف الارتباط (كوكيز) وتقنيات مشابهة لعرض إعلانات بناءً على زياراتك السابقة لهذا الموقع ومواقع أخرى. يمكنك معرفة المزيد عن استخدام جوجل للبيانات والتحكم في تفضيلات الإعلانات المخصَّصة من صفحة إعدادات إعلانات جوجل.',
      'privacy.p6.h': 'خصوصية الأطفال',
      'privacy.p6': 'هذا الموقع غير موجَّه للأطفال دون سن 13 عامًا، ولا ننوي جمع أي معلومات شخصية من الأطفال.',
      'privacy.p7.h': 'تغييرات على السياسة',
      'privacy.p7': 'قد نحدّث هذه السياسة من وقتٍ لآخر. سيُعلن عن أي تغييرات في هذه الصفحة مع تاريخ التحديث.',
      'privacy.p8.h': 'تواصل معنا',
      'privacy.p8': 'لو عندك أسئلة عن سياسة الخصوصية دي، تواصل معانا على الإيميل الموجود في صفحة "تواصل معنا".',
      'page.terms.title': 'شروط الاستخدام',
      'terms.p1.h': 'الموافقة على الشروط',
      'terms.p1': 'باستخدامك لموقع MonoTools، فإنك توافق على شروط الاستخدام هذه. إذا كنت لا توافق، يُرجى عدم استخدام الموقع.',
      'terms.p2.h': 'وصف الخدمة',
      'terms.p2': 'يقدّم MonoTools أدوات صور ووسائل مساعدة مجانية تعمل داخل المتصفح، منها مولّد أكواد QR، وأداة إزالة الخلفية، وأداة ضغط الصور، وصانع صور البروفايل، وأداة تحميل صور يوتيوب، وأداة تحويل الصور إلى PDF. تتم كل عمليات المعالجة محليًا داخل متصفحك.',
      'terms.p3.h': 'الاستخدام المقبول',
      'terms.p3': 'أنت توافق على عدم استخدام هذه الأدوات في معالجة محتوى غير قانوني، أو ينتهك حقوق نشر أو خصوصية طرف آخر، أو يخالف شروط استخدام أي طرف ثالث (بما في ذلك يوتيوب بالنسبة لأداة تحميل الصور المصغرة).',
      'terms.p4.h': 'الخدمة "كما هي"، من غير ضمان',
      'terms.p4': 'يُقدَّم هذا الموقع وأدواته "كما هي" دون أي ضمان من أي نوع. لا نضمن أن تكون الأدوات خالية من الأخطاء، أو تعمل دون انقطاع، أو مناسبة لغرض معين.',
      'terms.p5.h': 'حدود المسؤولية',
      'terms.p5': 'إلى أقصى حد يسمح به القانون، لا يتحمّل MonoTools والقائمون عليه أي مسؤولية عن أضرار ناتجة عن استخدامك للموقع أو أدواته أو عدم قدرتك على استخدامها.',
      'terms.p6.h': 'الإعلانات',
      'terms.p6': 'قد يعرض الموقع إعلانات من طرف ثالث (مثل Google AdSense) لتغطية تكاليف تشغيل الخدمة. لسنا مسؤولين عن محتوى إعلانات الطرف الثالث.',
      'terms.p7.h': 'تغييرات على الشروط',
      'terms.p7': 'قد نحدّث هذه الشروط من وقتٍ لآخر. استمرارك في استخدام الموقع بعد أي تغيير يعني موافقتك على الشروط المحدَّثة.',
      'seo.wordCounter.heading': 'عن عداد الكلمات هذا',
      'seo.wordCounter.intro': 'تقوم هذه الأداة بإحصاء الكلمات والأحرف والجمل والفقرات أثناء الكتابة، وتقدير الوقت اللازم لقراءة النص أو إلقائه بصوت مسموع — وكل ذلك داخل متصفحك دون إرسال أي بيانات إلى أي خادم.',
      'seo.wordCounter.howto.1': 'الصق النص أو اكتبه في الصندوق.',
      'seo.wordCounter.howto.2': 'شاهد الإحصائيات وكثافة الكلمات المفتاحية تتحدّث فورًا.',
      'seo.wordCounter.faqHeading': 'أسئلة شائعة',
      'seo.wordCounter.faq.1.q': 'هل يوجد حد لكمية النص الذي يمكن لصقه؟',
      'seo.wordCounter.faq.1.a': 'لا يوجد حد عملي، فالأداة تعمل بالكامل داخل متصفحك وتعتمد فقط على إمكانيات جهازك.',
      'seo.wordCounter.faq.2.q': 'كيف يتم حساب زمن القراءة؟',
      'seo.wordCounter.faq.2.a': 'يُحسب بناءً على متوسط سرعة قراءة الشخص البالغ، وهي نحو 200 كلمة في الدقيقة، بينما يُحسب زمن الإلقاء بمعدل 130 كلمة في الدقيقة تقريبًا.',
      'seo.wordCounter.faq.3.q': 'هل تدعم هذه الأداة النصوص العربية؟',
      'seo.wordCounter.faq.3.a': 'نعم، يدعم العداد وتحليل كثافة الكلمات المفتاحية اللغة العربية بالكامل، إضافة إلى الإنجليزية.',
      'seo.passwordGenerator.heading': 'عن مولّد كلمات المرور هذا',
      'seo.passwordGenerator.intro': 'أنشئ كلمة مرور قوية وغير متوقعة باستخدام مولّد الأرقام العشوائية الآمن المدمج في متصفحك. يتم إنشاء كلمة المرور بالكامل على جهازك ولا تُرسل إلى أي مكان.',
      'seo.passwordGenerator.howto.1': 'اختر الطول ونوع الأحرف المطلوبة.',
      'seo.passwordGenerator.howto.2': 'اضغط على "توليد كلمة المرور".',
      'seo.passwordGenerator.howto.3': 'انسخ النتيجة بضغطة واحدة.',
      'seo.passwordGenerator.faqHeading': 'أسئلة شائعة',
      'seo.passwordGenerator.faq.1.q': 'هل يتم تخزين كلمات المرور هذه في أي مكان؟',
      'seo.passwordGenerator.faq.1.a': 'لا، يتم توليد كل كلمة مرور محليًا داخل متصفحك وتختفي بمجرد مغادرة الصفحة أو إعادة تحميلها.',
      'seo.passwordGenerator.faq.2.q': 'ما الذي يجعل كلمة المرور قوية؟',
      'seo.passwordGenerator.faq.2.a': 'الطول هو العامل الأهم، يليه مزج الأحرف الكبيرة والصغيرة والأرقام والرموز. يُفضّل ألا يقل الطول عن 12 إلى 16 حرفًا.',
      'seo.passwordGenerator.faq.3.q': 'هل يمكن استخدام هذه الأداة لكلمات مرور بنكية أو للعمل؟',
      'seo.passwordGenerator.faq.3.a': 'نعم، فعملية التوليد تتم بالكامل دون اتصال بالخادم داخل متصفحك، ما يجعلها بنفس خصوصية كتابتها يدويًا على ورقة.',
      'seo.caseConverter.heading': 'عن محوّل حالة الأحرف هذا',
      'seo.caseConverter.intro': 'حوّل أي نص إلى أحرف كبيرة أو صغيرة أو حالة العنوان أو حالة الجملة أو الحالة المتبادلة بضغطة واحدة، وكل ذلك يتم معالجته محليًا داخل متصفحك.',
      'seo.caseConverter.howto.1': 'الصق النص في الصندوق.',
      'seo.caseConverter.howto.2': 'اضغط على نمط الحالة الذي تريده.',
      'seo.caseConverter.faqHeading': 'أسئلة شائعة',
      'seo.caseConverter.faq.1.q': 'ما استخدام "حالة العنوان"؟',
      'seo.caseConverter.faq.1.a': 'تُستخدم لتكبير أول حرف من كل كلمة رئيسية، وتُستخدم عادة في العناوين الرئيسية وعناوين المقالات.',
      'seo.caseConverter.faq.2.q': 'هل تعمل مع النصوص العربية؟',
      'seo.caseConverter.faq.2.a': 'يُطبَّق تحويل الحالة على الأحرف اللاتينية؛ أما اللغة العربية فلا تحتوي على تمييز بين الأحرف الكبيرة والصغيرة، لذا يمر النص العربي دون تغيير.',
      'seo.caseConverter.faq.3.q': 'هل يُحفظ نصي في أي مكان؟',
      'seo.caseConverter.faq.3.a': 'لا، تتم جميع العمليات محليًا داخل متصفحك ولا يُرفع أي شيء إلى الخادم.',
      'seo.dedupe.heading': 'عن أداة إزالة الأسطر المكرّرة هذه',
      'seo.dedupe.intro': 'الصق أي قائمة — عناوين بريد إلكتروني، أو كلمات مفتاحية، أو روابط، أو أسماء — وستقوم هذه الأداة بإزالة كل سطر مكرر مع الحفاظ على أول ظهور له وعلى الترتيب الأصلي.',
      'seo.dedupe.howto.1': 'الصق القائمة، عنصر واحد في كل سطر.',
      'seo.dedupe.howto.2': 'اختر ما إذا كنت تريد تجاهل المسافات الزائدة.',
      'seo.dedupe.howto.3': 'اضغط "إزالة التكرار" وانسخ النتيجة.',
      'seo.dedupe.faqHeading': 'أسئلة شائعة',
      'seo.dedupe.faq.1.q': 'هل يغيّر ترتيب الأسطر المتبقية؟',
      'seo.dedupe.faq.1.a': 'لا، يتم الحفاظ دائمًا على الترتيب الأصلي، وتتم إزالة النسخ المكررة اللاحقة فقط.',
      'seo.dedupe.faq.2.q': 'هل تُعامل الأسطر الفارغة كتكرار؟',
      'seo.dedupe.faq.2.a': 'عند تفعيل خيار "تجاهل المسافات الزائدة"، تتم إزالة الأسطر الفارغة أو التي تحتوي على مسافات فقط بالكامل.',
      'seo.dedupe.faq.3.q': 'هل تراعي الأداة حالة الأحرف؟',
      'seo.dedupe.faq.3.a': 'نعم، تُعامل الأسطر التي تختلف فقط في حالة الأحرف كأسطر مختلفة.',
      'seo.textDiff.heading': 'عن أداة مقارنة النصوص هذه',
      'seo.textDiff.intro': 'الصق نسختين من نص، وستقوم هذه الأداة بتمييز كل سطر أُضيف أو حُذف بينهما، مما يسهّل عليك رؤية كل ما تغيّر بالضبط.',
      'seo.textDiff.howto.1': 'الصق النص الأصلي في الجهة اليسرى.',
      'seo.textDiff.howto.2': 'الصق النص المعدَّل في الجهة اليمنى.',
      'seo.textDiff.howto.3': 'اضغط "مقارنة" لرؤية الفروقات مميّزة.',
      'seo.textDiff.faqHeading': 'أسئلة شائعة',
      'seo.textDiff.faq.1.q': 'هل تقارن الأداة كلمة بكلمة أم سطرًا بسطر؟',
      'seo.textDiff.faq.1.a': 'تقارن هذه الأداة سطرًا بسطر، وهي الطريقة الأكثر شيوعًا ووضوحًا لمراجعة التغييرات في النصوص أو الأكواد.',
      'seo.textDiff.faq.2.q': 'هل يوجد حد لحجم النص؟',
      'seo.textDiff.faq.2.a': 'نعم، بحد أقصى 600 سطر لكل جانب، للحفاظ على سرعة المقارنة واستجابتها داخل المتصفح.',
      'seo.textDiff.faq.3.q': 'هل يُرفع نصي إلى أي مكان؟',
      'seo.textDiff.faq.3.a': 'لا، تتم عملية المقارنة بالكامل محليًا داخل متصفحك.',
      'seo.loremIpsum.heading': 'عن مولّد النص التجريبي هذا',
      'seo.loremIpsum.intro': 'أنشئ أي عدد من فقرات النص التجريبي الكلاسيكي Lorem Ipsum، وهو مفيد لملء النماذج الأولية والتخطيطات قبل جاهزية المحتوى الفعلي.',
      'seo.loremIpsum.howto.1': 'اختر عدد الفقرات المطلوبة.',
      'seo.loremIpsum.howto.2': 'اضغط "توليد النص" وانسخ النتيجة.',
      'seo.loremIpsum.faqHeading': 'أسئلة شائعة',
      'seo.loremIpsum.faq.1.q': 'ما هو Lorem Ipsum؟',
      'seo.loremIpsum.faq.1.a': 'هو نص بديل قياسي مستخدم في صناعتي الطباعة والتصميم منذ القرن السادس عشر، واختير لأنه يبدو كلاتينية مقروءة دون أن يحمل معنى فعليًا.',
      'seo.loremIpsum.faq.2.q': 'لماذا نستخدم نصًا بديلاً بدلاً من المحتوى الفعلي؟',
      'seo.loremIpsum.faq.2.a': 'يتيح للمصممين التركيز على التخطيط والطباعة دون تشتت أو تأخر بسبب عدم جاهزية المحتوى الفعلي.',
      'seo.loremIpsum.faq.3.q': 'هل يمكنني توليد أكثر من 20 فقرة؟',
      'seo.loremIpsum.faq.3.a': 'تحدّ الأداة عدد الفقرات بـ 20 في كل عملية توليد لتسهيل التعامل مع الناتج، ويمكنك توليد دفعة أخرى عند الحاجة.',
      'seo.slugGenerator.heading': 'عن مولّد رابط URL هذا',
      'seo.slugGenerator.intro': 'حوّل أي عنوان أو عبارة إلى رابط نظيف بأحرف صغيرة ومفصول بشرطات — وهو الشكل الذي تتوقعه محركات البحث وأنظمة إدارة المحتوى — فور الكتابة.',
      'seo.slugGenerator.howto.1': 'اكتب أو الصق العنوان.',
      'seo.slugGenerator.howto.2': 'انسخ الرابط الناتج فورًا.',
      'seo.slugGenerator.faqHeading': 'أسئلة شائعة',
      'seo.slugGenerator.faq.1.q': 'ما هو رابط الـ Slug؟',
      'seo.slugGenerator.faq.1.a': 'هو الجزء المقروء من عنوان الصفحة الذي يحدد صفحة معينة، مثل "my-article-title" في رابط مقالة بمدونة.',
      'seo.slugGenerator.faq.2.q': 'لماذا الروابط النظيفة مهمة لتحسين محركات البحث؟',
      'seo.slugGenerator.faq.2.a': 'الروابط النظيفة والوصفية أسهل على محركات البحث والقراء على حد سواء من السلاسل الطويلة للأحرف العشوائية.',
      'seo.slugGenerator.faq.3.q': 'هل تدعم الأداة العناوين العربية؟',
      'seo.slugGenerator.faq.3.a': 'نعم، يتم الحفاظ على الأحرف العربية داخل الرابط الناتج مع الشرطات الفاصلة المعتادة.',

      'seo.jsonFormatter.heading': 'عن منسّق JSON هذا', 'seo.jsonFormatter.faqHeading': 'أسئلة شائعة',
      'seo.jsonFormatter.intro': 'الصق أي بيانات JSON لتنسيقها بمسافات بادئة واضحة وتلوين للكود، أو لتحديد مكان أي خطأ في الصياغة فورًا. تتم كل العمليات محليًا داخل متصفحك.',
      'seo.jsonFormatter.howto.1': 'الصق بيانات JSON في الصندوق.',
      'seo.jsonFormatter.howto.2': 'اضغط "تنسيق" لعرضها بمسافات واضحة، أو "ضغط" لاختصارها.',
      'seo.jsonFormatter.faq.1.q': 'ماذا يحدث إذا كان بيانات JSON بها خطأ؟',
      'seo.jsonFormatter.faq.1.a': 'تعرض الأداة رسالة خطأ واضحة توضّح المشكلة وموقعها تقريبًا، لتتمكن من إصلاحها بسرعة.',
      'seo.jsonFormatter.faq.2.q': 'ما الفرق بين "تنسيق" و"ضغط"؟',
      'seo.jsonFormatter.faq.2.a': 'يضيف "تنسيق" مسافات بادئة وفواصل أسطر لتحسين القراءة، بينما يزيل "ضغط" كل المسافات غير الضرورية للحصول على أصغر حجم ممكن للملف.',
      'seo.jsonFormatter.faq.3.q': 'هل تُرفع بياناتي إلى أي مكان؟',
      'seo.jsonFormatter.faq.3.a': 'لا، تتم كل عمليات التحليل والتنسيق محليًا داخل متصفحك — ولا يُرسل أي شيء إلى أي خادم.',

      'seo.colorConverter.heading': 'عن محوّل الألوان هذا', 'seo.colorConverter.faqHeading': 'أسئلة شائعة',
      'seo.colorConverter.intro': 'أدخل لونًا بأي صيغة شائعة — HEX أو RGB أو HSL — لتراه فورًا محوَّلًا إلى الصيغتين الأخريين، مع معاينة حية للون.',
      'seo.colorConverter.howto.1': 'اكتب أو الصق قيمة اللون، أو استخدم منتقي الألوان.',
      'seo.colorConverter.howto.2': 'اطّلع على قيم HEX وRGB وHSL المحوَّلة فورًا.',
      'seo.colorConverter.faq.1.q': 'ما صيغ الألوان المدعومة؟',
      'seo.colorConverter.faq.1.a': 'تدعم الأداة الإدخال بصيغة HEX (3 أو 6 خانات)، وRGB، وHSL، وتُعرض الصيغ الثلاث دائمًا كنتيجة.',
      'seo.colorConverter.faq.2.q': 'ما الفرق بين RGB وHSL؟',
      'seo.colorConverter.faq.2.a': 'تحدّد صيغة RGB اللون عبر شدة الأحمر والأخضر والأزرق، بينما تحدّده صيغة HSL عبر درجة اللون والتشبع والإضاءة — وهي غالبًا أكثر سهولة عند تعديل درجة اللون.',
      'seo.colorConverter.faq.3.q': 'هل يمكنني استخدام منتقي الألوان المدمج بدلاً من الكتابة؟',
      'seo.colorConverter.faq.3.a': 'نعم، الضغط على مربع اللون يفتح منتقي الألوان المدمج في متصفحك، ويبقى متزامنًا مع حقل النص.',
      'lang.ar': 'العربية', 'lang.en': 'English',
    }
  };

  let curLang = localStorage.getItem('monotools-lang') || 'en';

  function t(key) {
    return (I18N[curLang] && I18N[curLang][key]) || (I18N.en[key]) || key;
  }

  function applyLang(lang) {
    curLang = lang;
    localStorage.setItem('monotools-lang', lang);
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(node => {
      const key = node.getAttribute('data-i18n');
      const val = t(key);
      if (val) node.textContent = val;
    });
    $$('[data-i18n-ph]').forEach(node => {
      node.setAttribute('placeholder', t(node.getAttribute('data-i18n-ph')));
    });
    const label = $('#langLabel');
    if (label) label.textContent = lang === 'en' ? t('lang.ar') : t('lang.en');
    reRenderDynamic();
  }

  /* ======================================================================
     QR CODE GENERATOR 
     ====================================================================== */
  function initQR() {
    const view = $('#view-qr');
    if (!view) return;
    const textEl = $('#qrText', view);
    const sizeEl = $('#qrSize', view);
    const eccEl  = $('#qrEcc', view);
    const genBtn = $('#qrGen', view);
    const preview = $('#qrPreview', view);
    const dlBtn = $('#qrDownload', view);

    // If the input looks like a domain/URL but is missing the scheme,
    // prepend https:// automatically so scanning it opens the link
    // directly instead of just showing inert text.
    function autoPrefixLink(raw) {
      const text = raw.trim();
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text)) return text; // already has a scheme
      const looksLikeDomain = /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(text.split(/\s+/)[0]) && !text.includes(' ');
      return looksLikeDomain ? 'https://' + text : text;
    }

    function generate() {
      const raw = textEl.value.trim();
      if (!raw) { showError(view, t('qr.errEmpty')); return; }
      const text = autoPrefixLink(raw);
      clearError(view);
      preview.innerHTML = '';
      // Error correction defaults to H (highest, ~30% recoverable) so the
      // code stays scannable even if partly obscured, printed small, or
      // captured at an angle — the standard choice for reliable scanning.
      const ecc = QRCode.CorrectLevel[eccEl && eccEl.value ? eccEl.value : 'H'];
      try {
        // Render the raw code at a modest internal size first...
        const rendered = document.createElement('div');
        new QRCode(rendered, {
          text, width: 256, height: 256,
          colorDark: '#000000', colorLight: '#ffffff',
          correctLevel: ecc,
        });

        // The library draws to an internal <canvas> synchronously inside
        // the constructor above, so its pixels are ready immediately. It
        // then *also* copies that canvas into a hidden <img> (for older
        // browser support), but that copy decodes asynchronously — if we
        // read from the <img> too early, it can still be blank, which is
        // exactly what caused the blank/white result. Always prefer the
        // already-drawn <canvas>; only fall back to the <img> — and only
        // once it has actually finished loading — if no canvas exists.
        function withSource(cb) {
          const canvasNode = $('canvas', rendered);
          if (canvasNode) { cb(canvasNode); return; }
          const imgNode = $('img', rendered);
          if (!imgNode) { showError(view, t('qr.errEmpty')); return; }
          if (imgNode.complete && imgNode.naturalWidth > 0) { cb(imgNode); return; }
          imgNode.addEventListener('load', () => cb(imgNode), { once: true });
          imgNode.addEventListener('error', () => showError(view, t('qr.errEmpty')), { once: true });
        }

        withSource((node) => {
          // ...then composite it onto a padded canvas so the code always
          // ships with a proper quiet zone (required by the QR standard —
          // without it, many phone cameras fail to recognize the code at
          // all, even though lenient decoders can still read it).
          const QUIET_RATIO = 0.9; // code occupies 90% of the box, 5% margin per side
          const box = 280;
          const out = document.createElement('canvas');
          out.width = box;
          out.height = box;
          const ctx = out.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, box, box);
          const inner = box * QUIET_RATIO;
          const offset = (box - inner) / 2;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(node, offset, offset, inner, inner);

          preview.innerHTML = '';
          out.style.width = '100%';
          out.style.height = '100%';
          out.style.aspectRatio = '1 / 1';
          preview.appendChild(out);
        });
        dlBtn.style.display = 'inline-flex';
      } catch (e) {
        showError(view, e.message);
      }
    }

    genBtn.addEventListener('click', generate);
    textEl.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate(); });

    dlBtn.addEventListener('click', () => {
      const size = sizeEl ? parseInt(sizeEl.value, 10) : 1024;
      const source = $('canvas', preview);
      if (!source) return;

      const out = document.createElement('canvas');
      out.width = size;
      out.height = size;
      const ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(source, 0, 0, size, size);
      out.toBlob((blob) => {
        downloadBlob(blob, 'MonoTools-QR-HighRes.png');
      }, 'image/png');
    });
  }

  /* ======================================================================
     BACKGROUND REMOVER
     ====================================================================== */
  let _tfMod = null, _bgModel = null, _bgProcessor = null;

  function otsuThreshold(mask) {
    // Automatically finds the best cut point between foreground/background
    // in the AI mask's histogram, per image, instead of a fixed guess.
    const hist = new Array(256).fill(0);
    for (let i = 0; i < mask.length; i++) hist[mask[i]]++;
    const total = mask.length;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0, wB = 0, maxVar = -1, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      if (varBetween > maxVar) { maxVar = varBetween; threshold = t; }
    }
    // Never trust an extreme, near-degenerate split (near-uniform mask) —
    // fall back to a safe mid-point in that case.
    return (threshold < 10 || threshold > 245) ? 128 : threshold;
  }

  // Separable min/max filter (box erosion/dilation) over a 0/1 mask.
  function boxFilter(mask, w, h, radius, mode) {
    const tmp = new Uint8Array(w * h);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        let val = mode === 'max' ? 0 : 1;
        const xs = Math.max(0, x - radius), xe = Math.min(w - 1, x + radius);
        for (let xx = xs; xx <= xe; xx++) {
          const v = mask[rowOff + xx];
          if (mode === 'max') { if (v > val) val = v; } else { if (v < val) val = v; }
        }
        tmp[rowOff + x] = val;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let val = mode === 'max' ? 0 : 1;
        const ys = Math.max(0, y - radius), ye = Math.min(h - 1, y + radius);
        for (let yy = ys; yy <= ye; yy++) {
          const v = tmp[yy * w + x];
          if (mode === 'max') { if (v > val) val = v; } else { if (v < val) val = v; }
        }
        out[y * w + x] = val;
      }
    }
    return out;
  }

  // Erosion then dilation: shaves off thin spurs/tendrils (stray edges,
  // leaked background slivers) while leaving the bulky main subject intact.
  function morphOpen(mask, w, h, radius) {
    return boxFilter(boxFilter(mask, w, h, radius, 'min'), w, h, radius, 'max');
  }

  // Keeps only the connected regions that are a meaningful fraction of the
  // largest one — drops small isolated islands of leaked background/noise.
  function keepLargeComponents(mask, w, h, minRatio) {
    const total = w * h;
    const labels = new Int32Array(total).fill(-1);
    const stack = new Int32Array(total);
    const sizes = [];
    let compId = 0;

    for (let i = 0; i < total; i++) {
      if (mask[i] === 1 && labels[i] === -1) {
        let sp = 0;
        stack[sp++] = i;
        labels[i] = compId;
        let count = 0;
        while (sp > 0) {
          const idx = stack[--sp];
          count++;
          const x = idx % w, y = (idx / w) | 0;
          if (x > 0) { const n = idx - 1; if (mask[n] === 1 && labels[n] === -1) { labels[n] = compId; stack[sp++] = n; } }
          if (x < w - 1) { const n = idx + 1; if (mask[n] === 1 && labels[n] === -1) { labels[n] = compId; stack[sp++] = n; } }
          if (y > 0) { const n = idx - w; if (mask[n] === 1 && labels[n] === -1) { labels[n] = compId; stack[sp++] = n; } }
          if (y < h - 1) { const n = idx + w; if (mask[n] === 1 && labels[n] === -1) { labels[n] = compId; stack[sp++] = n; } }
        }
        sizes.push(count);
        compId++;
      }
    }
    if (sizes.length === 0) return mask;

    let maxSize = 0;
    for (const s of sizes) if (s > maxSize) maxSize = s;
    const keep = sizes.map(s => s >= maxSize * minRatio);

    const out = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      if (mask[i] === 1 && keep[labels[i]]) out[i] = 1;
    }
    return out;
  }

  // Shrinks the mask to a capped working resolution before running the
  // (relatively expensive) morphology/labeling passes. This is not a
  // quality compromise: the AI model itself only ever segments at ~1024px,
  // then the mask is upscaled to the full photo size — so real detail is
  // already capped well below that, and cleaning up at a smaller size is
  // both far faster and just as accurate.
  function downsampleMask(mask, w, h, maxDim) {
    const scale = Math.min(1, maxDim / Math.max(w, h));
    if (scale === 1) return { data: mask, w, h, scale: 1 };
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));
    const out = new Uint8ClampedArray(nw * nh);
    for (let y = 0; y < nh; y++) {
      const sy = Math.min(h - 1, Math.floor(y / scale));
      const rowOff = sy * w;
      for (let x = 0; x < nw; x++) {
        const sx = Math.min(w - 1, Math.floor(x / scale));
        out[y * nw + x] = mask[rowOff + sx];
      }
    }
    return { data: out, w: nw, h: nh, scale };
  }

  function upsampleBinaryMask(mask, mw, mh, w, h) {
    if (mw === w && mh === h) return mask;
    const out = new Uint8Array(w * h);
    const sx = mw / w, sy = mh / h;
    for (let y = 0; y < h; y++) {
      const my = Math.min(mh - 1, Math.floor(y * sy));
      const rowOff = my * mw;
      for (let x = 0; x < w; x++) {
        const mx = Math.min(mw - 1, Math.floor(x * sx));
        out[y * w + x] = mask[rowOff + mx];
      }
    }
    return out;
  }

  // Full cleanup pass on the AI mask: binarize at the auto threshold, shave
  // off thin leaked edges, then drop small disconnected noise blobs — while
  // keeping the ORIGINAL soft alpha values (not the binarized ones) for
  // every pixel that survives, so fur/edge softness is preserved. Runs on a
  // capped working resolution so it stays fast even on large phone photos.
  function cleanupMask(rawMask, w, h) {
    const WORK_MAX_DIM = 768;
    const { data: smallMask, w: sw, h: sh } = downsampleMask(rawMask, w, h, WORK_MAX_DIM);

    const tol = otsuThreshold(smallMask);
    const smallTotal = sw * sh;
    let binary = new Uint8Array(smallTotal);
    for (let i = 0; i < smallTotal; i++) binary[i] = smallMask[i] > tol ? 1 : 0;

    binary = morphOpen(binary, sw, sh, 2);
    binary = keepLargeComponents(binary, sw, sh, 0.02);

    const fullBinary = upsampleBinaryMask(binary, sw, sh, w, h);

    const total = w * h;
    const finalAlpha = new Uint8ClampedArray(total);
    for (let i = 0; i < total; i++) finalAlpha[i] = fullBinary[i] ? rawMask[i] : 0;
    return finalAlpha;
  }

  function initBgRemover() {
    const view = $('#view-bg');
    if (!view) return;
    const zone = $('#bgZone', view);
    const input = $('#bgInput', view);
    const work = $('#bgWork', view);
    const preview = $('#bgPreview', view);

    let currentBlob = null;

    wireUploadZone(zone, input, async (file) => {
      clearError(work);
      preview.classList.add('active');
      preview.innerHTML = '';

      const wrap = spinner(t('bg.loading'));
      preview.appendChild(wrap);

      try {
        if (!_bgModel) {
          _tfMod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
          _tfMod.env.allowLocalModels = false;
          const p = $('p', wrap); if(p) p.textContent = t('bg.model');
          _bgModel = await _tfMod.AutoModel.from_pretrained('briaai/RMBG-1.4', { config: { model_type: 'custom' } });
          _bgProcessor = await _tfMod.AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
            config: { do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5], image_std: [1.0, 1.0, 1.0], resample: 2, rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 } }
          });
        }
        
        const p = $('p', wrap); if(p) p.textContent = t('bg.processing');
        const url = URL.createObjectURL(file);
        const image = await _tfMod.RawImage.fromURL(url);
        const { pixel_values } = await _bgProcessor(image);
        const { output } = await _bgModel({ input: pixel_values });
        const mask = await _tfMod.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

        const w = image.width, h = image.height;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const rawCtx = c.getContext('2d'); rawCtx.drawImage(image.toCanvas(), 0, 0);
        const rawImgData = rawCtx.getImageData(0, 0, w, h);

        const cleanAlpha = cleanupMask(mask.data, w, h);
        const pd = new ImageData(new Uint8ClampedArray(rawImgData.data), w, h);
        for (let i = 0; i < cleanAlpha.length; ++i) {
          pd.data[4 * i + 3] = cleanAlpha[i];
        }

        const tempC = document.createElement('canvas'); tempC.width = w; tempC.height = h;
        tempC.getContext('2d').putImageData(pd, 0, 0);
        currentBlob = await new Promise(r => tempC.toBlob(r, 'image/png'));

        preview.innerHTML = '';
        const imgWrap = el('div', { class: 'preview-img-wrap' });
        const outImg = el('img', { alt: t('bg.done') }); outImg.src = URL.createObjectURL(currentBlob);
        outImg.style.background = 'repeating-conic-gradient(rgba(0,0,0,0.05) 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';
        imgWrap.appendChild(outImg);

        const info = el('div', { class: 'result-info' },
          el('span', { class: 'result-info-item' }, t('bg.done'), ' — ', el('strong', {}, formatBytes(currentBlob.size)))
        );
        const dlBtn = el('button', {
          class: 'btn btn-block', html: ICONS.download + ' ' + t('bg.download'),
          onclick: () => downloadBlob(currentBlob, 'monotools-nobg.png')
        });
        preview.append(imgWrap, info, dlBtn);

      } catch (e) {
        console.error(e);
        preview.classList.remove('active');
        preview.innerHTML = '';
        showError(work, t('bg.errFail'));
      }
    });
  }

  /* ======================================================================
     IMAGE COMPRESSOR
     ====================================================================== */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function initCompressor() {
    const view = $('#view-compress');
    if (!view) return;
    const zone = $('#compressZone', view);
    const input = $('#compressInput', view);
    const work = $('#compressWork', view);
    const preview = $('#compressPreview', view);

    const MAX_DIM = 1920;       // cap huge photos down before compressing
    const TARGET_BYTES = 1024 * 1024; // 1MB ceiling

    let _origSize = 0, _origName = 'image', currentBlob = null;

    function encodeAt(canvas, quality) {
      return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    }

    // Finds the HIGHEST JPEG quality that still lands under the 1MB target.
    // Tries full quality first (many images won't even need reduction), then
    // binary-searches for the best quality/size tradeoff otherwise.
    async function findBestQuality(canvas, maxBytes) {
      const fullQuality = await encodeAt(canvas, 1);
      if (fullQuality.size <= maxBytes) return fullQuality;

      let lo = 0.05, hi = 0.98, best = null;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const blob = await encodeAt(canvas, mid);
        if (blob.size <= maxBytes) { best = blob; lo = mid; }
        else { hi = mid; }
      }
      // Extremely large/detailed image that can't fit even at the lowest
      // tried quality — return the smallest one we found rather than fail.
      return best || await encodeAt(canvas, lo);
    }

    async function renderCompressed(canvas) {
      currentBlob = await findBestQuality(canvas, TARGET_BYTES);

      preview.classList.add('active');
      preview.innerHTML = '';
      const wrap = el('div', { class: 'preview-img-wrap' });
      const outImg = el('img', { alt: t('compress.title') });
      outImg.src = URL.createObjectURL(currentBlob);
      wrap.appendChild(outImg);

      const reduction = _origSize > 0 ? Math.round((1 - currentBlob.size / _origSize) * 100) : 0;
      const info = el('div', { class: 'result-info' },
        el('span', { class: 'result-info-item' }, t('compress.originalSize') + ': ', el('strong', {}, formatBytes(_origSize))),
        el('span', { class: 'result-info-item' }, t('compress.compressedSize') + ': ', el('strong', {}, formatBytes(currentBlob.size))),
        el('span', { class: 'result-info-item' }, el('strong', {}, (reduction >= 0 ? '-' : '+') + Math.abs(reduction) + '%'))
      );
      const dlBtn = el('button', {
        class: 'btn btn-block', html: ICONS.download + ' ' + t('compress.download'),
        onclick: () => downloadBlob(currentBlob, _origName + '-compressed.jpg')
      });
      preview.append(wrap, info, dlBtn);
    }

    wireUploadZone(zone, input, async (file) => {
      clearError(work);
      preview.classList.remove('active');
      preview.innerHTML = '';
      preview.classList.add('active');
      preview.appendChild(spinner(t('processing')));

      _origSize = file.size;
      _origName = (file.name || 'image').replace(/\.[^.]+$/, '');
      const url = URL.createObjectURL(file);

      try {
        const img = await loadImage(url);
        // Only shrink genuinely large photos — never upscale, never touch
        // images that are already within bounds.
        const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        // JPEG has no alpha channel — without this, any transparent area
        // in the source (e.g. a PNG logo) would render as solid black
        // instead of white once flattened.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        await renderCompressed(canvas);
      } catch (e) {
        console.error(e);
        preview.classList.remove('active');
        preview.innerHTML = '';
        showError(work, t('compress.errFail'));
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  }

  function initPfp() {
    const view = $('#view-pfp');
    if (!view) return;
    const zone = $('#pfpZone', view);
    const input = $('#pfpInput', view);
    const work = $('#pfpWork', view);
    const editor = $('#pfpEditor', view);
    const frame = $('#pfpCropFrame', view);
    const cropImg = $('#pfpCropImg', view);
    const downloadBtn = $('#pfpDownloadBtn', view);
    const preview = $('#pfpPreview', view);

    const MIN_SCALE = 1, MAX_SCALE = 4;
    let naturalW = 0, naturalH = 0, baseScale = 1, userScale = 1;
    let left = 0, top = 0;
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    let currentUrl = null;
    const pointers = new Map();
    let pinchStartDist = 0, pinchStartScale = 1;

    function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
    function frameSize() { return frame.clientWidth || 280; }

    function applyTransform() {
      const fs = frameSize();
      const w = naturalW * baseScale * userScale;
      const h = naturalH * baseScale * userScale;
      const minLeft = Math.min(0, fs - w);
      const minTop = Math.min(0, fs - h);
      left = clamp(left, minLeft, 0);
      top = clamp(top, minTop, 0);
      cropImg.style.width = w + 'px';
      cropImg.style.height = h + 'px';
      cropImg.style.left = left + 'px';
      cropImg.style.top = top + 'px';
    }

    function resetView() {
      const fs = frameSize();
      baseScale = fs / Math.min(naturalW, naturalH);
      userScale = 1;
      left = (fs - naturalW * baseScale) / 2;
      top = (fs - naturalH * baseScale) / 2;
      applyTransform();
    }

    frame.addEventListener('pointerdown', (e) => {
      frame.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        startLeft = left; startTop = top;
        frame.classList.add('dragging');
      } else if (pointers.size === 2) {
        dragging = false;
        const pts = [...pointers.values()];
        pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStartScale = userScale;
      }
    });

    frame.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchStartDist > 0) {
          userScale = clamp(pinchStartScale * (dist / pinchStartDist), MIN_SCALE, MAX_SCALE);
          applyTransform();
        }
      } else if (dragging && pointers.size === 1) {
        left = startLeft + (e.clientX - startX);
        top = startTop + (e.clientY - startY);
        applyTransform();
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;
      if (pointers.size === 0) {
        dragging = false;
        frame.classList.remove('dragging');
      }
    }
    frame.addEventListener('pointerup', endPointer);
    frame.addEventListener('pointercancel', endPointer);

    frame.addEventListener('wheel', (e) => {
      e.preventDefault();
      userScale = clamp(userScale - e.deltaY * 0.001, MIN_SCALE, MAX_SCALE);
      applyTransform();
    }, { passive: false });

    window.addEventListener('resize', () => {
      if (editor.style.display !== 'none' && naturalW) applyTransform();
    });

    function buildOutputCanvas() {
      const fs = frameSize();
      const displayScale = baseScale * userScale;
      const cropX = -left / displayScale;
      const cropY = -top / displayScale;
      const cropSize = fs / displayScale;

      const outputSize = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      // Clip to a circle, then draw exactly the region the user framed —
      // everything outside the circle stays fully transparent.
      ctx.save();
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(cropImg, cropX, cropY, cropSize, cropSize, 0, 0, outputSize, outputSize);
      ctx.restore();
      return canvas;
    }

    downloadBtn.addEventListener('click', async () => {
      clearError(work);
      try {
        const canvas = buildOutputCanvas();
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));

        preview.classList.add('active');
        preview.innerHTML = '';
        const wrap = el('div', { class: 'preview-img-wrap' });
        const outImg = el('img', { alt: t('pfp.title') });
        outImg.src = URL.createObjectURL(blob);
        outImg.style.background = 'repeating-conic-gradient(rgba(0,0,0,0.05) 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';
        wrap.appendChild(outImg);

        const info = el('div', { class: 'result-info' },
          el('span', { class: 'result-info-item' }, `${canvas.width} × ${canvas.height}px`),
          el('span', { class: 'result-info-item' }, el('strong', {}, formatBytes(blob.size)))
        );
        preview.append(wrap, info);

        downloadBlob(blob, 'profile-picture.png');
      } catch (e) {
        console.error(e);
        showError(work, t('pfp.errFail'));
      }
    });

    wireUploadZone(zone, input, async (file) => {
      clearError(work);
      editor.style.display = 'none';
      preview.classList.remove('active');
      preview.innerHTML = '';

      if (currentUrl) URL.revokeObjectURL(currentUrl);
      const url = URL.createObjectURL(file);
      currentUrl = url;

      try {
        await new Promise((resolve, reject) => {
          cropImg.onload = resolve;
          cropImg.onerror = reject;
          cropImg.src = url;
        });
        naturalW = cropImg.naturalWidth;
        naturalH = cropImg.naturalHeight;
        editor.style.display = 'block';
        requestAnimationFrame(resetView);
      } catch (e) {
        console.error(e);
        showError(work, t('pfp.errFail'));
      }
    });
  }

  /* ======================================================================
     YOUTUBE THUMBNAIL DOWNLOADER 
     ====================================================================== */
  function extractYouTubeId(url) {
    if (!url) return null;
    const s = url.trim();
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
      /[?&]v=([A-Za-z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = s.match(p);
      if (m) return m[1];
    }
    return null;
  }

  const THUMB_VARIANTS = [
    { id: 'maxresdefault', label: 'Max Res', w: 1280, h: 720 },
    { id: 'sddefault',    label: 'SD',      w: 640,  h: 480 },
    { id: 'hqdefault',    label: 'HQ',      w: 480,  h: 360 },
    { id: 'mqdefault',    label: 'MQ',      w: 320,  h: 180 },
    { id: 'default',      label: 'Default', w: 120,  h: 90  },
  ];

  function probeImageDims(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ ok: false, w: 0, h: 0 });
      img.src = url;
    });
  }

  function initYouTube() {
    const view = $('#view-youtube');
    if (!view) return;
    const urlEl = $('#ytUrl', view);
    const fetchBtn = $('#ytFetch', view);
    const work = $('#ytWork', view);
    const results = $('#ytResults', view);

    async function fetchThumbs() {
      clearError(work);
      const url = urlEl.value.trim();
      if (!url) { showError(work, t('yt.errEmpty')); return; }
      const id = extractYouTubeId(url);
      if (!id) { showError(work, t('yt.errInvalid')); return; }

      results.innerHTML = '';
      results.appendChild(spinner(t('yt.searching')));

      // Try each quality from highest to lowest and use the first one that
      // actually exists. YouTube never returns a real 404 for a missing
      // size — it silently serves a 120×90 grey placeholder image instead,
      // so a plain onload/onerror check would wrongly treat that
      // placeholder as a valid "Max Res" thumbnail. Checking the loaded
      // image's actual dimensions is what catches that.
      let chosen = null;
      for (const v of THUMB_VARIANTS) {
        const direct = `https://i.ytimg.com/vi/${id}/${v.id}.jpg`;
        const probe = await probeImageDims(direct);
        if (!probe.ok) continue;
        const isPlaceholder = probe.w === 120 && probe.h === 90 && !(v.w === 120 && v.h === 90);
        if (isPlaceholder) continue;
        chosen = { ...v, direct };
        break;
      }

      results.innerHTML = '';
      if (!chosen) { showError(work, t('yt.errInvalid')); return; }

      const v = chosen;
      const card = el('div', { class: 'yt-thumb-card' });
      const prev = el('div', { class: 'yt-thumb-preview' });
      const img = el('img', { alt: v.label, loading: 'lazy', src: v.direct });
      prev.appendChild(img);

      const meta = el('div', { class: 'yt-thumb-meta' },
        el('div', { class: 'yt-thumb-meta-info' },
          el('strong', {}, `${v.label} (${v.w}×${v.h})`),
          el('span', {}, `${v.id}.jpg`)
        ),
        el('button', {
          class: 'btn', html: ICONS.download + ' ' + t('yt.download'),
          onclick: async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            const original = btn.innerHTML;
            btn.innerHTML = '…';
            try {
              const proxied = 'https://images.weserv.nl/?url=' + encodeURIComponent('i.ytimg.com/vi/' + id + '/' + v.id + '.jpg');
              const res = await fetch(proxied);
              if (!res.ok) throw new Error('proxy');
              const blob = await res.blob();
              downloadBlob(blob, `${id}_${v.id}.jpg`);
            } catch (err) {
              window.open(v.direct, '_blank');
            } finally {
              btn.disabled = false;
              btn.innerHTML = original;
            }
          }
        })
      );
      card.append(prev, meta);
      results.appendChild(card);
    }

    fetchBtn.addEventListener('click', fetchThumbs);
    urlEl.addEventListener('keydown', e => { if (e.key === 'Enter') fetchThumbs(); });
  }

  /* ======================================================================
     IMAGE TO PDF 
     ====================================================================== */
  function initPdf() {
    const view = $('#view-pdf');
    if (!view) return;
    const zone = $('#pdfZone', view);
    const input = $('#pdfInput', view);
    const list = $('#pdfList', view);
    const orientGroup = $('#pdfOrient', view);
    const sizeSel = $('#pdfSize', view);
    const genBtn = $('#pdfGen', view);
    const work = $('#pdfWork', view);
    const preview = $('#pdfPreview', view);
    const files = [];
    let orientation = 'p';

    $$('.scale-option', orientGroup).forEach(opt => {
      opt.addEventListener('click', () => {
        $$('.scale-option', orientGroup).forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        orientation = opt.dataset.orient;
      });
    });

    wireUploadZone(zone, input, (file) => {
      if (!file.type.startsWith('image/')) return;
      files.push({ file, url: URL.createObjectURL(file), name: file.name, size: file.size });
      renderList();
    });

    function renderList() {
      list.innerHTML = '';
      list.style.display = files.length ? 'block' : 'none';
      genBtn.style.display = files.length ? 'inline-flex' : 'none';
      files.forEach((f, i) => {
        const row = el('div', { class: 'pdf-file-row' },
          el('img', { src: f.url, alt: f.name }),
          el('span', { class: 'pdf-file-name' }, `${i + 1}. ${f.name}`),
          el('span', { class: 'pdf-file-size' }, formatBytes(f.size)),
          el('button', {
            class: 'pdf-file-del', html: t('pdf.remove'),
            onclick: () => {
              URL.revokeObjectURL(f.url);
              files.splice(i, 1);
              renderList();
            }
          })
        );
        list.appendChild(row);
      });
    }

    genBtn.addEventListener('click', async () => {
      if (files.length === 0) { showError(work, t('pdf.errEmpty')); return; }
      clearError(work);
      preview.classList.add('active');
      preview.innerHTML = '';
      preview.appendChild(spinner(t('pdf.processing')));

      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation, unit: 'pt', format: sizeSel.value });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 24;
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const img = await loadImage(f.url);
          const w = img.naturalWidth, h = img.naturalHeight;
          const ratio = Math.min(maxW / w, maxH / h);
          let dw = w, dh = h;
          if (ratio < 1) { dw = w * ratio; dh = h * ratio; }
          else { dw = maxW; dh = maxW * (h / w); if (dh > maxH) { dh = maxH; dw = maxH * (w / h); } }

          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

          if (i > 0) pdf.addPage();
          const x = (pageW - dw) / 2;
          const y = (pageH - dh) / 2;
          pdf.addImage(dataUrl, 'JPEG', x, y, dw, dh);
        }

        const blob = pdf.output('blob');
        preview.innerHTML = '';
        const info = el('div', { class: 'result-info' },
          el('span', { class: 'result-info-item' }, t('pdf.images') + ': ', el('strong', {}, String(files.length))),
          el('span', { class: 'result-info-item' }, t('pdf.size') + ': ', el('strong', {}, formatBytes(blob.size)))
        );
        const dlBtn = el('button', {
          class: 'btn btn-block', html: ICONS.download + ' ' + t('pdf.download'),
          onclick: () => downloadBlob(blob, 'monotools-images.pdf')
        });
        preview.append(info, dlBtn);
      } catch (e) {
        preview.classList.remove('active');
        preview.innerHTML = '';
        showError(work, e.message || 'error');
      }
    });
  }

  function reRenderDynamic() {
    const pdfList = $('#pdfList');
    if (pdfList) {
      $$('.pdf-file-del', pdfList).forEach(b => { b.textContent = t('pdf.remove'); });
    }
    wcRefresh();
    sgRefresh();
  }

  /* ======================================================================
     WORD COUNTER
     ====================================================================== */
  const STOPWORDS = {
    en: "the a an and or but if then of to in on for with is are was were be been it its this that i you he she we they as at by from not no do does did have has had will would can could about into over under your my our their his her them us so such".split(' '),
    ar: "في من على إلى عن أن كان كانت الذي التي هذا هذه أو ثم لقد لم لن هو هي هم كما حيث كل بعد قبل عند ما لا قد له لها لهم أنا أنت نحن إذا أي أيضا بين حتى منذ".split(' '),
  };
  function fmtDuration(words, wpm) {
    if (!words) return '0 ' + t('unit.sec');
    const mins = words / wpm;
    const m = Math.floor(mins), s = Math.round((mins - m) * 60);
    return (m ? m + ' ' + t('unit.min') + ' ' : '') + s + ' ' + t('unit.sec');
  }
  function statCard(val, lbl) {
    return el('div', { class: 'stat' }, el('div', { class: 's-val' }, String(val)), el('div', { class: 's-lbl' }, lbl));
  }
  function wcRefresh() {
    const input = $('#wcInput');
    if (!input) return;
    const statsBox = $('#wcStats');
    const kwBox = $('#wcKeywords');
    const txt = input.value;
    const words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
    const chars = txt.length;
    const noSpace = txt.replace(/\s/g, '').length;
    const sentences = txt.trim() ? txt.split(/[.!?؟…]+/).map(s => s.trim()).filter(Boolean).length : 0;
    const paragraphs = txt.trim() ? txt.split(/\n+/).map(s => s.trim()).filter(Boolean).length : 0;

    statsBox.innerHTML = '';
    statsBox.append(
      statCard(words, t('wc.words')), statCard(chars, t('wc.chars')), statCard(noSpace, t('wc.charsNoSpace')),
      statCard(sentences, t('wc.sentences')), statCard(paragraphs, t('wc.paragraphs')),
      statCard(fmtDuration(words, 200), t('wc.readingTime')), statCard(fmtDuration(words, 130), t('wc.speakingTime'))
    );

    const freq = {};
    const stop = STOPWORDS[curLang === 'ar' ? 'ar' : 'en'];
    txt.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, ' ').split(/\s+/).forEach(w => {
      if (w.length < 3 || stop.includes(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    kwBox.innerHTML = '';
    if (!words || !top.length) return;
    const max = top[0][1];
    const table = el('table', { class: 'kw-table' });
    table.appendChild(el('caption', { class: 'lbl', style: 'text-align:start;caption-side:top;' }, t('wc.keywordDensity')));
    top.forEach(([w, c]) => {
      const pct = (c / words * 100).toFixed(1);
      const row = el('tr', {},
        el('td', { style: 'width:34%' }, el('b', {}, w)),
        el('td', { style: 'width:52%' }, el('div', { class: 'kw-bar', style: `width:${Math.round(c / max * 100)}%` })),
        el('td', { style: 'text-align:end' }, `${c} · ${pct}%`)
      );
      table.appendChild(row);
    });
    kwBox.appendChild(table);
  }
  function initWordCounter() {
    const input = $('#wcInput');
    if (!input) return;
    input.addEventListener('input', wcRefresh);
    wcRefresh();
  }

  /* ======================================================================
     PASSWORD GENERATOR
     ====================================================================== */
  function pgGenerate() {
    const out = $('#pgOutput');
    if (!out) return null;
    const sets = [];
    const opts = [['pgUpper', 'ABCDEFGHJKLMNPQRSTUVWXYZ'], ['pgLower', 'abcdefghijkmnpqrstuvwxyz'], ['pgNums', '23456789'], ['pgSyms', '!@#$%^&*()-_=+[]{};:,.?/']];
    opts.forEach(([id, chars]) => { if ($('#' + id).checked) sets.push(chars); });
    if (!sets.length) { toast(t('pg.noneSelected')); return null; }

    const len = parseInt($('#pgLength').value, 10);
    const pool = sets.join('');
    const rnd = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
    let pass = sets.map(s => s[rnd(s.length)]).join('');
    while (pass.length < len) pass += pool[rnd(pool.length)];
    pass = pass.split('').sort(() => rnd(3) - 1).join('').slice(0, len);

    out.textContent = pass;
    const score = (len >= 16 ? 3 : len >= 12 ? 2 : len >= 8 ? 1 : 0) + sets.length;
    const [pct, color, label] = score <= 3 ? [33, 'var(--bad)', t('pg.weak')]
      : score <= 5 ? [66, 'var(--warn)', t('pg.medium')]
      : [100, 'var(--good)', t('pg.strong')];
    const bar = $('#pgBar');
    bar.style.width = pct + '%';
    bar.style.background = color;
    $('#pgStrengthLabel').textContent = label;
    return pass;
  }
  function initPasswordGenerator() {
    const genBtn = $('#pgGenerate');
    if (!genBtn) return;
    ['pgUpper', 'pgLower', 'pgNums', 'pgSyms'].forEach(id => $('#' + id).addEventListener('change', pgGenerate));
    $('#pgLength').addEventListener('input', e => { $('#pgLengthVal').textContent = e.target.value; pgGenerate(); });
    genBtn.addEventListener('click', pgGenerate);
    $('#pgCopy').addEventListener('click', () => copyText($('#pgOutput').textContent));
    pgGenerate();
  }

  /* ======================================================================
     CASE CONVERTER
     ====================================================================== */
  const CASE_FNS = {
    upper: s => s.toUpperCase(),
    lower: s => s.toLowerCase(),
    title: s => s.toLowerCase().replace(/(^|[\s"'«»(\[{\-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase()),
    sentence: s => s.toLowerCase().replace(/(^\s*\p{L}|([.!?؟]\s+)\p{L})/gu, m => m.toUpperCase()),
    alt: s => { let up = true; return s.split('').map(c => { if (!/\p{L}/u.test(c)) return c; up = !up; return up ? c.toUpperCase() : c.toLowerCase(); }).join(''); },
  };
  function initCaseConverter() {
    const input = $('#ccInput');
    if (!input) return;
    const output = $('#ccOutput');
    $$('[data-case]').forEach(btn => btn.addEventListener('click', () => {
      output.textContent = CASE_FNS[btn.dataset.case](input.value);
    }));
    $('#ccCopy').addEventListener('click', () => copyText(output.textContent));
    $('#ccClear').addEventListener('click', () => { input.value = ''; output.textContent = ''; });
  }

  /* ======================================================================
     REMOVE DUPLICATE LINES
     ====================================================================== */
  function initDedupe() {
    const runBtn = $('#ddRun');
    if (!runBtn) return;
    runBtn.addEventListener('click', () => {
      const trimIt = $('#ddTrim').checked;
      const lines = $('#ddInput').value.split(/\r?\n/);
      const total = lines.filter(l => l.trim() !== '').length;
      const seen = new Set(); const out = [];
      lines.forEach(l => {
        const key = trimIt ? l.trim() : l;
        if (key === '' && trimIt) return;
        if (!seen.has(key)) { seen.add(key); out.push(key); }
      });
      $('#ddLinesIn').textContent = total;
      $('#ddLinesOut').textContent = out.length;
      $('#ddRemoved').textContent = total - out.length;
      $('#ddOutput').value = out.join('\n');
    });
    $('#ddCopy').addEventListener('click', () => copyText($('#ddOutput').value));
  }

  /* ======================================================================
     TEXT DIFF CHECKER (LCS-based line diff)
     ====================================================================== */
  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function initTextDiff() {
    const runBtn = $('#dfRun');
    if (!runBtn) return;
    runBtn.addEventListener('click', () => {
      const A = $('#dfA').value.split(/\r?\n/), B = $('#dfB').value.split(/\r?\n/);
      const n = A.length, m = B.length;
      const out = $('#dfOutput');
      if (n > 600 || m > 600) { out.textContent = t('df.tooLarge'); return; }

      const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      let i = 0, j = 0, html = '', add = 0, del = 0;
      while (i < n && j < m) {
        if (A[i] === B[j]) { html += '<div class="line"> ' + escapeHtml(A[i]) + '</div>'; i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { html += '<div class="line del">- ' + escapeHtml(A[i]) + '</div>'; del++; i++; }
        else { html += '<div class="line add">+ ' + escapeHtml(B[j]) + '</div>'; add++; j++; }
      }
      while (i < n) { html += '<div class="line del">- ' + escapeHtml(A[i++]) + '</div>'; del++; }
      while (j < m) { html += '<div class="line add">+ ' + escapeHtml(B[j++]) + '</div>'; add++; }

      out.innerHTML = (add === 0 && del === 0) ? t('df.identical') : html;
      $('#dfAddCount').textContent = '+' + add;
      $('#dfDelCount').textContent = '-' + del;
    });
  }

  /* ======================================================================
     LOREM IPSUM GENERATOR
     ====================================================================== */
  const LOREM_WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(' ');
  function liGenerate() {
    const out = $('#liOutput');
    if (!out) return;
    const n = Math.min(20, Math.max(1, parseInt($('#liCount').value, 10) || 3));
    const paragraphs = [];
    for (let p = 0; p < n; p++) {
      const wc = 45 + Math.floor(Math.random() * 16);
      const words = [];
      for (let k = 0; k < wc; k++) words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
      words[0] = 'Lorem'; words[1] = 'ipsum';
      const s = words.join(' ');
      paragraphs.push(s.charAt(0).toUpperCase() + s.slice(1) + '.');
    }
    out.textContent = paragraphs.join('\n\n');
  }
  function initLoremIpsum() {
    const genBtn = $('#liGenerate');
    if (!genBtn) return;
    genBtn.addEventListener('click', liGenerate);
    $('#liCopy').addEventListener('click', () => copyText($('#liOutput').textContent));
    liGenerate();
  }

  /* ======================================================================
     URL SLUG GENERATOR
     ====================================================================== */
  function sgRefresh() {
    const input = $('#sgInput');
    if (!input) return;
    const out = $('#sgOutput');
    const v = input.value;
    if (!v.trim()) { out.textContent = t('sg.empty'); return; }
    out.textContent = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9\p{Script=Arabic}]+/gu, '-').replace(/^-+|-+$/g, '');
  }
  function initSlugGenerator() {
    const input = $('#sgInput');
    if (!input) return;
    input.addEventListener('input', sgRefresh);
    $('#sgCopy').addEventListener('click', () => copyText($('#sgOutput').textContent));
    sgRefresh();
  }

  /* ======================================================================
     JSON FORMATTER & VALIDATOR
     ====================================================================== */
  function jfHighlight(json) {
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'jf-number';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'jf-key' : 'jf-string';
      else if (/true|false/.test(match)) cls = 'jf-boolean';
      else if (/null/.test(match)) cls = 'jf-null';
      return `<span class="${cls}">${match}</span>`;
    });
  }
  function initJsonFormatter() {
    const input = $('#jfInput');
    if (!input) return;
    const output = $('#jfOutput');
    const work = $('#jfWork');

    function run(indent) {
      clearError(work);
      const raw = input.value.trim();
      if (!raw) { output.innerHTML = ''; return; }
      try {
        const parsed = JSON.parse(raw);
        const json = JSON.stringify(parsed, null, indent);
        output.innerHTML = jfHighlight(escapeHtml(json));
      } catch (e) {
        output.innerHTML = '';
        showError(work, t('jf.errInvalid') + ' — ' + e.message);
      }
    }

    $('#jfFormat').addEventListener('click', () => run(2));
    $('#jfMinify').addEventListener('click', () => run(0));
    $('#jfCopy').addEventListener('click', () => copyText(output.textContent));
  }

  /* ======================================================================
     COLOR CONVERTER
     ====================================================================== */
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function parseColor(str) {
    str = str.trim();
    let m;
    if ((m = str.match(/^#?([0-9a-f]{3})$/i))) {
      const [r, g, b] = m[1].split('').map(c => parseInt(c + c, 16));
      return { r, g, b };
    }
    if ((m = str.match(/^#?([0-9a-f]{6})$/i))) {
      const n = parseInt(m[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    if ((m = str.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i))) {
      return { r: +m[1], g: +m[2], b: +m[3] };
    }
    if ((m = str.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/i))) {
      return hslToRgb(+m[1], +m[2], +m[3]);
    }
    return null;
  }
  function initColorConverter() {
    const input = $('#cvInput');
    if (!input) return;
    const picker = $('#cvPicker');
    const swatch = $('#cvSwatch');
    const work = $('#cvWork');
    const hexOut = $('#cvHex'), rgbOut = $('#cvRgb'), hslOut = $('#cvHsl');

    function apply(rgb) {
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      swatch.style.background = hex;
      picker.value = hex;
      hexOut.textContent = hex;
      rgbOut.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      hslOut.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
    function fromText() {
      const rgb = parseColor(input.value);
      if (!rgb) { showError(work, t('cv.errInvalid')); return; }
      clearError(work);
      apply(rgb);
    }

    input.addEventListener('input', fromText);
    picker.addEventListener('input', () => { input.value = picker.value; fromText(); });
    $$('.cv-copy', work).forEach(btn => btn.addEventListener('click', () => copyText($('#' + btn.dataset.target).textContent)));

    input.value = '#6366f1';
    fromText();
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function boot() {
    $('#year').textContent = new Date().getFullYear();

    $('#navToggle')?.addEventListener('click', () => $('#mainNav').classList.toggle('open'));
    $('#langToggle')?.addEventListener('click', () => applyLang(curLang === 'en' ? 'ar' : 'en'));

    // Each init function guards itself if its tool isn't on the current
    // page, so it's safe to call all of them on every page.
    initQR();
    initBgRemover();
    initCompressor();
    initPfp();
    initYouTube();
    initPdf();
    initWordCounter();
    initPasswordGenerator();
    initCaseConverter();
    initDedupe();
    initTextDiff();
    initLoremIpsum();
    initSlugGenerator();
    initJsonFormatter();
    initColorConverter();
    initCookieConsent();

    applyLang(curLang);
  }

  /* ======================================================================
     COOKIE / AD CONSENT NOTICE
     ====================================================================== */
  function initCookieConsent() {
    if (localStorage.getItem('monotools-consent')) return;
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML =
      '<p><span data-i18n="cookie.msg">This site may use cookies for ads and basic analytics. By continuing to use it, you agree to our</span> ' +
      '<a href="privacy-policy.html" data-i18n="cookie.privacyLink">Privacy Policy</a>.</p>' +
      '<button class="btn small" id="cookieAccept" data-i18n="cookie.accept">Got it</button>';
    document.body.appendChild(banner);
    $('#cookieAccept').addEventListener('click', () => {
      localStorage.setItem('monotools-consent', '1');
      banner.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();