/* ============================================================
   THE THERMOCHROME LEDGER — default content document (v1)
   This is the seed loaded into the CMS on first run. After
   that, all content lives in the database (Netlify Blobs)
   and is edited at /admin — never here.
   ============================================================ */
import projects from "./projects-data.mjs";

export default {
  v: 1,

  settings: {
    siteTitle: "Iris Kavan",
    wordmark: "Iris Kavan",
    mastheadTag: "Studies in available light",
    email: "hello@iriskavan.studio",
    socials: [
      { label: "Instagram", url: "https://instagram.com" },
      { label: "Vimeo", url: "https://vimeo.com" },
      { label: "Are.na", url: "https://are.na" },
    ],
    menuLedgerLine: "The ledger runs<br>1859 K – 12040 K",
    menuGuideLabel: "Owner's guide →",
    footer: {
      sig: "The studio is metering new commissions for <em class=\"wonk\">2026</em>.",
      colIndex: "Index",
      colRecords: "Records",
      colElsewhere: "Elsewhere",
      baseLeft: "© 2026 Iris Kavan · all photographs placeholder frames",
      baseMid: "Filed at 55.68° N, 12.57° E · Copenhagen",
      baseRight: "The Thermochrome Ledger, v2",
      newsletterEnabled: false,
      newsletterTitle: "The darkroom letter",
      newsletterNote: "Occasional prints, openings and new records. No noise.",
      newsletterPlaceholder: "you@studio.com",
      newsletterButton: "Subscribe",
    },
    bootLine: "Metering available light",
    schemaMarkup: "",
  },

  nav: [
    { href: "/", label: "Home", k: 3200, visible: true, children: [] },
    { href: "/work.html", label: "Selected Work", k: 1859, visible: true, children: [] },
    { href: "/archive.html", label: "Project Archive", k: 2200, visible: true, children: [] },
    { href: "/about.html", label: "About", k: 4400, visible: true, children: [] },
    { href: "/services.html", label: "Services", k: 5600, visible: true, children: [] },
    { href: "/testimonials.html", label: "Testimonials", k: 6500, visible: true, children: [] },
    { href: "/contact.html", label: "Contact", k: 10500, visible: true, children: [] },
  ],

  seo: {
    canonicalBase: "https://iris-kavan-ledger.netlify.app",
    ogImage: "",
    robots: "User-agent: *\nAllow: /",
  },

  pages: {
    home: {
      metaTitle: "Iris Kavan · Studies in Available Light",
      metaDesc: "The portfolio of photographer Iris Kavan: six bodies of work filed by colour temperature, from candlelight at 1859 K to blue hour at 12040 K. No strobes since 2019.",
      kicker: "Iris Kavan · photographer · available light only",
      titleHtml: "Studies in <em>available</em> light",
      lede: "Every photograph here is filed by the colour temperature of the light it was made in: candle, sodium, tungsten, late sun, overcast, blue hour.",
      rangeLabel: "Archive range",
      rangeValue: "1859 K – 12040 K",
      rangeAccent: "No strobes since 2019",
      scrollHint: "Scroll to warm up",
      practice: {
        no: "01", label: "The practice",
        bigHtml: "The strobe promises noon on demand. I keep a <span class=\"k-word\">ledger</span> instead: every commission filed by the colour of the hour it was made in, and nothing added to the room.",
        note: "Six bodies of work are currently on file, spanning the whole visible ledger. Scroll, and the room around you will change temperature with them.",
      },
      records: {
        no: "02", label: "Selected records",
        featured: ["candle-studies", "overcast-atlas", "blue-hour-protocol"],
        openLabel: "Open record",
        browseCta: "Browse all six records",
      },
      meter: [
        { text: "1859 K candle" }, { text: "EV −6.0" }, { text: "no strobes", bold: true },
        { text: "2200 K sodium vapour" }, { text: "f/1.4" },
        { text: "3200 K tungsten" }, { text: "1/8 sec, hand-held" },
        { text: "4400 K late sun" }, { text: "the ledger runs", bold: true },
        { text: "6500 K overcast" }, { text: "EV +14" },
        { text: "10500 K blue hour" }, { text: "eleven usable minutes" },
      ],
      photographer: {
        no: "03", label: "The photographer",
        headingHtml: "Kept by <em>Iris Kavan</em>, Copenhagen",
        note: "Fifteen years of working only with the light already in the room. Commissions for editorial, fashion, architecture and portraiture, anywhere on the kelvin scale, nowhere off it.",
        linkLabel: "Read the full record →",
        portrait: { seed: "ik-portrait", src: "", w: 1200, h: 1600, alt: "Portrait of the photographer Iris Kavan" },
        portraitK: 4400,
      },
      commissions: {
        no: "04", label: "Commissions",
        bigHtml: "The studio is <em class=\"wonk\">metering</em> new commissions.",
        ctaLabel: "Open the order form",
      },
    },

    work: {
      metaTitle: "Selected Work · Iris Kavan",
      metaDesc: "Six bodies of work by photographer Iris Kavan, presented in kelvin order: The Candle Studies, Sodium Nights, Tungsten Interiors, The Late Sun Ledger, Overcast Atlas and Blue Hour Protocol.",
      fileNo: "REC", fileLabel: "Selected work · six records in kelvin order",
      titleHtml: "Warmest <em>first</em>.",
      lede: "Read downward and the light cools: begin at a single flame, end at a sky eleven minutes from night.",
      openLabel: "Open the record →",
      filmStamp: "+ Film",
    },

    archive: {
      metaTitle: "Project Archive · Iris Kavan",
      metaDesc: "The full contact sheet of the studio: eighteen frames across portrait, documentary, editorial, landscape, fashion and architecture, inspected through a glass loupe.",
      fileNo: "SHT", fileLabel: "Project archive · one contact sheet, eighteen frames",
      titleHtml: "The contact <em>sheet</em>",
      lede: "Everything on file, printed at once.",
      hint: "A glass loupe follows your cursor across the sheet; press any frame to open its record.",
      allLabel: "All frames",
    },

    about: {
      metaTitle: "About · Iris Kavan",
      metaDesc: "Iris Kavan is a Copenhagen-based photographer working exclusively with available light. Biography, equipment ledger, exposure log, clients and distinctions.",
      hero: {
        fileNo: "BIO", fileLabel: "The photographer",
        titleHtml: "Keeper of <em>available</em> light",
        lede: "Iris Kavan, b. 1989, Brno. Based in Copenhagen, working wherever the light is worth filing.",
        portrait: { seed: "ik-portrait", src: "", w: 1200, h: 1600, alt: "Portrait of Iris Kavan in the studio, by tungsten lamp" },
        figA: "Self", figB: "Studio, by one tungsten lamp", figC: "3200 K",
      },
      practice: {
        no: "01", label: "Practice",
        paras: [
          "In 2019 I sold every strobe I owned and wrote the proceeds into the first page of a ledger. The rule since then has been simple: <em>the light that is already there is the assignment.</em> If a room is lit by one candle, the photograph is about one candle. If a city is being stripped of its sodium lamps, the photograph had better hurry.",
          "The archive is filed by colour temperature rather than by year or client, because temperature is the honest index: it records what the world was doing, not what I was selling. Warmest first, coolest last, everything in between accounted for.",
          "Commissions are welcome anywhere on the scale. I photograph editorial, portraiture, fashion, architecture and the occasional forty-day hillside. I do not bring lights; I bring patience, fast glass and a meter.",
        ],
      },
      equipment: {
        no: "02", label: "Equipment ledger",
        items: [
          { name: "Hasselblad 907X / CFV 100C", note: "medium format" },
          { name: "Fujifilm GFX 100 II", note: "medium format" },
          { name: "Leica M11", note: "rangefinder" },
          { name: "Mamiya RZ67 Pro II", note: "film, 6×7" },
          { name: "Phase One XT / IQ4 150", note: "technical" },
          { name: "XCD 80mm f/1.9", note: "the candle lens" },
          { name: "Summilux 35mm f/1.4", note: "the night lens" },
          { name: "Sekonic L-858D", note: "the referee" },
        ],
      },
      log: {
        no: "03", label: "Exposure log",
        entries: [
          { yr: "2011", html: "First darkroom, borrowed. Brno." },
          { yr: "2016", html: "MFA, Royal Danish Academy; thesis on municipal street lighting." },
          { yr: "2019", html: "Sells all strobes. The ledger begins." },
          { yr: "2021", html: "First solo exhibition, <em>Rooms at Their Own Temperature</em>, Copenhagen." },
          { yr: "2023", html: "The forty-day hillside. Skye." },
          { yr: "2024", html: "Sodium Nights: five months in Osaka." },
          { yr: "2025", html: "Blue Hour Protocol wins the Architectural Photography Award, Sense of Place." },
          { yr: "2026", html: "Currently metering new commissions." },
        ],
      },
      clients: {
        no: "04", label: "Selected clients",
        stamps: ["Aurum Journal", "Meridian Press", "Cahier d'Intérieur", "Maison Halide", "Fjeld Atlas", "Meridian Arkitekter", "Kinfolk", "Monocle"],
      },
      awards: {
        no: "05", label: "Distinctions",
        entries: [
          { yr: "2025", text: "Architectural Photography Awards · Winner, Sense of Place" },
          { yr: "2025", text: "Lucie Awards · Portraiture, Nominee" },
          { yr: "2024", text: "World Report Award · Documentary, Finalist" },
          { yr: "2024", text: "ADC Europe · Editorial Photography, Silver" },
        ],
      },
      teamLabelNo: "06", teamLabel: "The studio",
      cta: { bigHtml: "If your project has its <em class=\"wonk\">own</em> light, we should talk.", ctaLabel: "Write to the studio" },
    },

    services: {
      metaTitle: "Services · Iris Kavan",
      metaDesc: "Commission the studio: editorial and campaign photography, portrait sittings, and archival printing, all by available light. Rates, process and lead times.",
      fileNo: "SRV", fileLabel: "Services · three standing orders",
      titleHtml: "Development <em>orders</em>",
      lede: "Three ways to commission the studio. Every order follows the f-stop process: wide open at discovery, stopped down at delivery.",
      faqNo: "FAQ", faqLabel: "Common questions",
      terms: "All rates exclude VAT and travel · a 30% booking fee files the date · full terms accompany every estimate.",
      ctaLabel: "Request an estimate",
    },

    testimonials: {
      metaTitle: "Testimonials · Iris Kavan",
      metaDesc: "Voices from editors, architects, creative directors and sitters: what it is like to commission photography made entirely by available light.",
      fileNo: "VOX", fileLabel: "Testimonials · voices, recorded in low light",
      titleHtml: "What the <em>sitters</em> say",
      cta: { bigHtml: "Add your voice to the <em class=\"wonk\">ledger</em>.", ctaLabel: "Commission the studio" },
    },

    contact: {
      metaTitle: "Contact · Iris Kavan",
      metaDesc: "Commission photographer Iris Kavan. File a development order: tell the studio about your project, its deadline, and the light you imagine.",
      fileNo: "ORD", fileLabel: "Contact · file a development order",
      titleHtml: "Write to the <em>studio</em>",
      lede: "Tell me about the project and, more importantly, about its light. The studio replies within two working days, usually after dark.",
      form: {
        nameLabel: "Your name", namePlaceholder: "Full name",
        emailLabel: "Email", emailPlaceholder: "you@studio.com",
        kindLabel: "Order type",
        kinds: ["Editorial / campaign commission", "Portrait sitting", "Prints / exhibition", "Something stranger"],
        briefLabel: "The project, and its light",
        briefPlaceholder: "What are we photographing, and what hour does it deserve?",
        deadlineLabel: "Deadline, if any", deadlinePlaceholder: "e.g. before the June issue closes",
        submitLabel: "File the request",
      },
      directLabel: "Direct",
      emailDisplayHtml: "hello@<br>iriskavan.studio",
      studioLabel: "Studio",
      addressHtml: "Sortedam Dossering 7B<br>2200 Copenhagen N<br>Denmark",
      phone: "",
      whatsapp: "",
      hoursLabel: "Printing hours",
      hoursHtml: "Tuesday–Friday, 10:00–18:00<br><span class=\"mute\">Darkroom: after sunset</span>",
      elsewhereLabel: "Elsewhere",
      repLabel: "Representation",
      repHtml: "Agence Halide, Paris<br><span class=\"mute\">for commissions in FR / BE / CH</span>",
      mapsEmbed: "",
      mapsLabel: "The darkroom on the map",
    },

    notes: {
      metaTitle: "Field Notes · Iris Kavan",
      metaDesc: "Notes from the studio of photographer Iris Kavan: light, process, and the occasional argument about street lamps.",
      fileNo: "NTS", fileLabel: "Field notes · from the studio",
      titleHtml: "Field <em>notes</em>",
      lede: "Occasional writing from the studio: light, process, places.",
      readLabel: "Read the note →",
      backLabel: "← All notes",
    },

    guide: {
      metaTitle: "Owner's Guide · The Thermochrome Ledger",
      metaDesc: "How this portfolio works: design philosophy, folder structure, the kelvin ambiance system, typography, motion, the admin panel, image replacement, editing workflow and deployment.",
      fileNo: "DOC", fileLabel: "Owner's guide",
      titleHtml: "The Thermochrome <em>Ledger</em>",
      lede: "Everything a photographer needs to make this site their own, no framework knowledge required.",
      sections: [
        { id: "philosophy", title: "Design philosophy", html: "<p>This site is built on one organising idea: <strong>photography is the management of colour temperature</strong>, so the portfolio is filed like a ledger of light: warmest work first, coolest last, everything indexed in kelvin. Every signature element flows from that premise:</p><ul><li>The <strong>kelvin rail</strong> on the right edge is the site's compass: it shows the temperature of whatever you are reading.</li><li>The <strong>ambient field</strong> re-tints every page toward the section on screen. Scroll through the work page and the room literally warms and cools.</li><li>Images arrive with a <strong>develop reveal</strong>: blown-out and soft, then settling into density, like a print in the bath.</li><li>Navigation passes through an <strong>aperture iris</strong>; the archive is a <strong>contact sheet read with a loupe</strong>; the cursor is a light meter.</li></ul><p>Nothing here is a stock component. If you keep the kelvin premise, you can change every word and image and the site will still feel inevitable.</p>" },
        { id: "admin", title: "The admin panel", html: "<p>Every piece of content on this site — headings, paragraphs, buttons, images, films, navigation, footer, SEO — is edited at <code>/admin</code>, no code required. Content lives in a database, pages are rendered from it on demand, and publishing purges the cache so changes appear immediately.</p><ul><li><strong>Draft → Preview → Publish</strong>: edits save to a draft. Preview shows the draft on the real site; Publish makes it live and files a revision you can roll back to.</li><li><strong>Media library</strong>: upload, crop, compress, alt text, captions; every image picker on the panel draws from it.</li><li><strong>Revisions & activity</strong>: every publish is snapshotted; every action is logged.</li><li><strong>Backup</strong>: export the entire content document as JSON, restore it later.</li></ul><p>The first visit to <code>/admin</code> creates the owner account. Keep the recovery code it shows you: it is the password-reset key.</p>" },
        { id: "structure", title: "Folder structure", html: "<pre><code>site/                    ← static shell (assets, admin app)\n  assets/css/main.css    ← the whole design system, sectioned 01–27\n  assets/js/app.js       ← the whole public engine, zero dependencies\n  assets/fonts/*.woff2   ← self-hosted Fraunces + Fragment Mono\n  admin/                 ← the CMS single-page app\nnetlify/functions/       ← the server\n  render.mjs             ← renders every public page from content\n  api.mjs                ← auth + content + media + logs API\n  media.mjs              ← serves uploaded files from the database\n  scheduled.mjs          ← hourly: scheduled publish/unpublish\n  lib/                   ← renderer, sanitizer, auth, default content\ntools/build.mjs          ← static snapshot exporter (optional)</code></pre>" },
        { id: "colour", title: "Colour system", html: "<p>There is no black and no white. The ground colours are <em>nocturne</em> (a darkroom green-black) and <em>archival paper</em> (a warm off-white); the identity colours are the six temperatures of the archive. All of them are CSS custom properties in section 01 of <code>main.css</code>. Change <code>--amber</code> and the accent shifts site-wide; change the six <code>--k-*</code> values and the whole identity re-tunes.</p>" },
        { id: "typography", title: "Typography", html: "<p>Two families, both self-hosted variable fonts:</p><ul><li><strong>Fraunces</strong>: the voice. A wonky old-style serif whose variable axes (<code>opsz</code>, <code>SOFT</code>, <code>WONK</code>) are used as <em>motion parameters</em>: headlines animate from soft/wonky to sharp as they develop, and hover states push titles into their italic, wonky cut.</li><li><strong>Fragment Mono</strong>: the ledger hand. Every index number, caption, kelvin reading and label.</li></ul><p>The scale is fluid (<code>clamp()</code> everywhere, tokens in section 01). To swap fonts, replace the four <code>.woff2</code> files and the <code>@font-face</code> blocks in section 02, but know that the develop animation leans on Fraunces' axes.</p>" },
        { id: "motion", title: "Motion system", html: "<p>Three verbs, used everywhere, defined in section 24 of the CSS:</p><ul><li><code>.dev</code>: <strong>develop</strong> — opacity + blur + over-brightness settling to density. The photographic reveal; used for nearly everything.</li><li><code>.wipe</code>: a print pulled edge-to-edge from the bath (clip-path inset).</li><li><code>.ap-mask</code>: <strong>aperture</strong> — a circular clip that irises open; used on the work-page plates and echoed by the page transition.</li></ul><p>All motion collapses to nothing under <code>prefers-reduced-motion</code>.</p>" },
        { id: "ambiance", title: "The kelvin ambiance", html: "<p>Any element can carry <code>data-k=\"3200\"</code>. As it crosses the middle of the viewport it becomes the page's target temperature; the engine converts kelvin to RGB (a real blackbody approximation) and eases the CSS variable <code>--ambient</code> toward it. That single variable drives the ambient gradient field, the kelvin rail needle, the cursor ring, the ghost numerals and the masthead readout.</p>" },
        { id: "images", title: "Images", html: "<p>Every image is managed from the admin panel's Media library. Uploads are compressed and resized in the browser before they are stored, get alt text and captions, and can be cropped. Any plate can also point at an external URL or keep its seeded placeholder. The kelvin wash (<code>.plate::after</code>) grades everything toward the record's temperature; if your files are already graded, soften it in section 11 of the CSS.</p>" },
        { id: "films", title: "Films & video", html: "<p>Every record's Motion section is a list of reels managed in the admin panel. Each reel is either a self-hosted MP4/WebM (uploaded through the Media library), a Vimeo/YouTube embed URL, or a labelled placeholder. Nothing loads until the viewer presses play. Per-reel toggles: autoplay, loop, mute, controls, poster.</p>" },
        { id: "performance", title: "Performance", html: "<ul><li>No frameworks on the public site: one CSS file, one JS module.</li><li>Pages render server-side from content and are cached at the CDN edge; publishing purges the cache, so the site is as fast as static hosting.</li><li>Fonts are self-hosted, preloaded, <code>font-display: swap</code>.</li><li>Images are lazy-loaded with real dimensions; uploads are compressed and resized before storage.</li><li>The WebGL light field renders at ⅔ resolution, only on the home hero, pauses off-screen.</li></ul>" },
        { id: "accessibility", title: "Accessibility", html: "<ul><li><code>prefers-reduced-motion</code> removes the grain, parallax, tilt, shader, boot count and all reveals; content is simply visible.</li><li>Semantic landmarks, a skip link, focus-visible rings, and a polite live region that announces page changes through the iris router.</li><li>The custom cursor only replaces the pointer on fine-pointer devices; the loupe is decorative and disabled on touch.</li></ul>" },
        { id: "deployment", title: "Deployment", html: "<p>The repository deploys to Netlify: static assets from <code>site/</code>, the renderer and API as Netlify Functions, content and media in Netlify Blobs. The contact form uses Netlify Forms; submissions appear in the Netlify dashboard. No servers to manage.</p>" },
      ],
    },

    notFound: {
      stamp: "Error 404 · blank frame",
      titleHtml: "Never <em>exposed</em>.",
      lede: "The frame you asked for isn't in the ledger; the shutter never fired on this one.",
      ctaLabel: "Back to the archive",
      metaTitle: "Frame not found · Iris Kavan",
      metaDesc: "This negative was never exposed. Return to the ledger.",
    },
    thanks: {
      stamp: "Order filed · 1859 K",
      titleHtml: "In the <em>bath</em>.",
      lede: "Your request is developing. The studio replies within two working days, usually after dark.",
      ctaLabel: "Return to the ledger",
      metaTitle: "Request filed · Iris Kavan",
      metaDesc: "Your development order has been filed. The studio replies within two working days.",
    },
  },

  projects,

  voices: [
    { id: "v1", q: "She waited forty minutes for a cloud, and the cloud was right. Our cover has never looked like anyone else's.", who: "Léonie Marchand", role: "Editor-in-chief, Aurum Journal", company: "Aurum Journal", rating: 5, photo: "", k: 1859, where: "Recorded at 1859 K · Fez", visible: true },
    { id: "v2", q: "Iris photographed our buildings the way we drew them, at the hour we drew them for. The blue hour frames hang in our lobby.", who: "Søren Meridian", role: "Partner, Meridian Arkitekter", company: "Meridian Arkitekter", rating: 5, photo: "", k: 10500, where: "Recorded at 10500 K · Chandigarh", visible: true },
    { id: "v3", q: "No lights, no assistants shouting, no noon. Just a person in the corner of the room who somehow left with the truest picture of my family we own.", who: "Amara Okafor", role: "Portrait sitting, private commission", company: "", rating: 5, photo: "", k: 3200, where: "Recorded at 3200 K · Copenhagen", visible: true },
    { id: "v4", q: "We handed her two hundred grey days and she handed us a campaign. The overcast frames outperformed every sunlit asset we have ever run.", who: "Vera Lindqvist", role: "Creative director, Maison Halide", company: "Maison Halide", rating: 5, photo: "", k: 6500, where: "Recorded at 6500 K · Copenhagen", visible: true },
    { id: "v5", q: "Her sodium series made our whole newsroom argue about street lamps. That is what photography is supposed to do.", who: "Kenji Watanabe", role: "Photo editor, Meridian Press", company: "Meridian Press", rating: 5, photo: "", k: 2200, where: "Recorded at 2200 K · Osaka", visible: true },
  ],

  services: [
    {
      id: "s1", no: "Order 01", lead: "lead time 6–10 weeks",
      titleHtml: "Editorial &amp; campaign commission", price: "From €4,800 / day",
      desc: "Full productions for magazines, maisons and architects who want their subject photographed at its own temperature. Includes art direction consultation, location metering and a graded, print-ready edit. Motion coverage (campaign films, director's cuts, social edits) folds into any production.",
      specs: [
        { dt: "Duration", dd: "1–10 shoot days" }, { dt: "Deliverables", dd: "25–60 graded frames" },
        { dt: "Licence", dd: "2 yr, territory-priced" }, { dt: "Travel", dd: "Worldwide, billed at cost" },
      ],
      steps: [
        { f: "f/1.4", text: "First call: the brief, and what light it deserves" },
        { f: "f/2.8", text: "Scout &amp; meter: locations read at the planned hour" },
        { f: "f/5.6", text: "The shoot: available light only, no exceptions" },
        { f: "f/11", text: "Edit &amp; grade: filed into your ledger, delivered" },
      ],
      visible: true,
    },
    {
      id: "s2", no: "Order 02", lead: "lead time 2–4 weeks",
      titleHtml: "Portrait sitting", price: "From €1,900 / sitting",
      desc: "A two-hour sitting in the light you already live in: your window, your lamp, your candle. Made for founders, authors, musicians and anyone tired of looking like a press release.",
      specs: [
        { dt: "Duration", dd: "2 hours, one location" }, { dt: "Deliverables", dd: "8 graded frames" },
        { dt: "Prints", dd: "One archival print included" }, { dt: "Where", dd: "Copenhagen, or travel" },
      ],
      steps: [
        { f: "f/1.4", text: "The conversation: where does your light live?" },
        { f: "f/2.8", text: "The sitting: slow, quiet, one roll at a time" },
        { f: "f/5.6", text: "The edit: you choose eight from the contact sheet" },
        { f: "f/11", text: "The print: delivered flat, stamped, filed" },
      ],
      visible: true,
    },
    {
      id: "s3", no: "Order 03", lead: "lead time 3–6 weeks",
      titleHtml: "Prints &amp; exhibition", price: "From €650 / print",
      desc: "Editioned archival pigment prints from any record in the ledger, and full exhibition production: sequencing, framing, and hanging plans tuned to the gallery's own light.",
      specs: [
        { dt: "Editions", dd: "Of 7 + 2 AP" }, { dt: "Sizes", dd: "40 cm – 180 cm" },
        { dt: "Paper", dd: "Hahnemühle Photo Rag" }, { dt: "Certificate", dd: "Signed, kelvin-stamped" },
      ],
      steps: [
        { f: "f/1.4", text: "Selection: from the archive, or your commission" },
        { f: "f/2.8", text: "Proofing: one small proof mailed for approval" },
        { f: "f/5.6", text: "Printing: graded to the wall it will hang on" },
        { f: "f/11", text: "Delivery: crated, insured, hung if local" },
      ],
      visible: true,
    },
  ],

  faqs: [],

  team: [],

  notes: [],
};
