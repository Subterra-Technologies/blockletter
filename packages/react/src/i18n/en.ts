import type { BuiltInBlockType } from '@subterra-technologies/blockletter';
import type { EditorMessages } from './messages';

/** "1 block", "3 blocks". */
const blocks = (count: number, number: (value: number) => string): string =>
  count === 1 ? `${number(count)} block` : `${number(count)} blocks`;

const capitalized = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** The words the brand kit's length limits call its fields. */
const BRAND_FIELD_WORDS = {
  name: 'organisation name',
  address: 'address',
  phone: 'phone number',
  email: 'email address',
  website: 'website',
  link: 'link',
} as const;

/** `value` and everything in it, frozen: the English is every editor's, and no one's to change. */
function frozen<T extends object>(value: T): T {
  for (const item of Object.values(value)) {
    if (typeof item === 'object' && item !== null) frozen(item);
  }
  Object.freeze(value);
  return value;
}

/**
 * The editor's English: every word it shows or says unless a host's `messages` replace it. Spread
 * a group to start a translation from it (`{ ...enMessages.toasts, deleted: … }`), or pass just the
 * entries that differ.
 */
export const enMessages: EditorMessages = frozen<EditorMessages>({
  common: {
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    remove: 'Remove',
    tryAgain: 'Try again',
    untitled: 'Untitled',
    hidden: 'Hidden from email',
    close: 'Close',
    options: 'Options',
    webAddress: 'https://',
    shortcut: ({ key, apple, shift = false }) =>
      apple ? `${shift ? '⇧' : ''}⌘${key}` : `Ctrl+${shift ? 'Shift+' : ''}${key}`,
    pixels: (pixels, { number }) => `${number(pixels)}px`,
  },

  topBar: {
    view: 'View',
    canvas: 'Canvas',
    preview: 'Preview',
    more: 'More',
    saveAsTemplate: 'Save as template…',
    readOnly: 'This issue is read-only, so nothing in it can be changed.',
  },

  panes: {
    label: 'Editor panes',
    blocks: 'Blocks',
    canvas: 'Canvas',
    edit: 'Edit',
    preview: 'Preview',
    backToCanvas: 'Back to canvas',
  },

  history: {
    undo: 'Undo',
    redo: 'Redo',
    undid: (action) => `Undid: ${action}.`,
    redid: (action) => `Redid: ${action}.`,
    added: (block) => `added the ${block} block`,
    moved: (block) => `moved the ${block} block`,
    duplicated: (block) => `duplicated the ${block} block`,
    deleted: (block) => `deleted the ${block} block`,
    showed: (block) => `showed the ${block} block`,
    hid: (block) => `hid the ${block} block`,
    edited: (block) => `edited the ${block} block`,
    restyled: (block) => `changed the ${block} block’s appearance`,
    refreshed: (block, source) => `refreshed the ${block} block from ${source}`,
    periodUpdated: 'updated the period',
    subjectEdited: 'edited the subject',
    preheaderEdited: 'edited the preview line',
  },

  palette: {
    region: 'Block palette',
    heading: 'Blocks',
    insertHeading: (where) => `Insert ${where}`,
    cancelInsert: 'Cancel insert',
    blocksUsed: (count, max, { number }) => `${number(count)} of ${number(max)} blocks`,
    hint: 'Choose a block to add it at the end of the issue.',
    dragHint: 'Choose a block to add it at the end, or drag it onto the canvas.',
    insertHint: 'The block goes exactly where the line on the canvas is.',
    groups: { content: 'Content', layout: 'Layout', graphics: 'Graphics' },
  },

  canvas: {
    heading: 'Canvas',
    instructions:
      'Choose a block to edit it. Drag a block to move it, or use its toolbar: the arrows move it, and Insert above or below adds a new block next to it. Alt with the up or down arrow moves the focused block too.',
    emptyHeading: 'This issue has no blocks yet',
    emptyHint: 'Add one from the block palette to start the layout.',
    full: (max, { number }) =>
      `This issue has ${number(max)} blocks, the most an issue can hold. Delete one before adding another.`,
    newBlockHere: 'New block goes here',
    autoFilled: 'Auto-filled',
    above: (block) => `above ${block}`,
    below: (block) => `below ${block}`,
    inserted: (block, position, total, { number }) =>
      `${block} inserted at position ${number(position)} of ${number(total)}.`,
    moved: (block, position, total, { number }) =>
      `${block} moved to position ${number(position)} of ${number(total)}.`,
    insertionPoint: (where) => `Insertion point set ${where}. Choose a block to insert.`,
    blockTitle: (block, summary) => (summary ? `${block} · ${summary}` : block),
    unknownBlock: (type) =>
      `Unknown block “${type}”. Nothing defines it, so the email leaves it out.`,
    notDrawn: 'This block could not be drawn. The preview shows its email.',
    blockNotDrawn: (block) => `The ${block} block could not be drawn. The preview shows its email.`,
    nothingYet: 'Nothing to show yet. The block stays out of the email until it has content.',
  },

  blockToolbar: {
    label: (block) => `${block} block`,
    edit: (block) => `Edit ${block}`,
    editTip: 'Edit block',
    moveUp: (block) => `Move ${block} up`,
    moveUpTip: 'Move up',
    moveDown: (block) => `Move ${block} down`,
    moveDownTip: 'Move down',
    insertAbove: (block) => `Insert a block above ${block}`,
    insertAboveTip: 'Insert a block above',
    insertBelow: (block) => `Insert a block below ${block}`,
    insertBelowTip: 'Insert a block below',
    show: (block) => `Show ${block}`,
    showTip: 'Show in the email',
    hide: (block) => `Hide ${block}`,
    hideTip: 'Hide from the email',
    duplicate: (block) => `Duplicate ${block}`,
    duplicateTip: 'Duplicate block',
    refresh: (block, source) => `Refresh ${block} from ${source}`,
    refreshTip: (source) => `Refresh from ${source}`,
    delete: (block) => `Delete ${block}`,
    deleteTip: 'Delete block',
  },

  inspector: {
    region: 'Inspector',
    tabs: { block: 'Block', appearance: 'Appearance', settings: 'Settings', brand: 'Brand kit' },
    chooseBlock: 'Choose a block on the canvas to edit what it says.',
    filledFrom: (source) => `Filled from ${source}`,
    readOnly: 'This issue is read-only, so its content can’t be changed.',
    noEditor: (type) =>
      `There is no editor for “${type}” blocks, so this block’s content can’t be changed here. It is kept as it is.`,
  },

  fields: {
    heading: 'Heading',
    headingOptional: 'Heading (optional)',
    subheading: 'Subheading',
    text: 'Text',
    title: 'Title',
    name: 'Name',
    label: 'Label',
    date: 'Date',
    link: 'Link',
    linkOptional: 'Link (optional)',
    linkLabelOptional: 'Link label (optional)',
    buttonLabel: 'Button label',
    buttonLink: 'Button link',
    picture: 'Picture',
    pictureOptional: 'Picture (optional)',
    altText: 'Alt text',
    altTextHelp: 'Describe the picture for readers who cannot see it.',
    captionOptional: 'Caption (optional)',
  },

  blocks: {
    header: {
      label: 'Header',
      description: 'Your logo over the newsletter title and the issue.',
      emptyCanvas: 'Empty header. It stays out of the email until it has a title.',
      issueLabel: 'Issue label',
      issueLabelPlaceholder: 'September 2026',
      logoText: 'Logo text',
      logoTextHelp:
        'Shown above the title when the brand kit has no logo, and read out as the logo’s description when it has one. Leave it blank to use the organisation’s name.',
    },
    letter: {
      label: 'Letter',
      description: 'A personal note with a photo and a signature.',
      emptyCanvas: 'No letter written yet. It stays out of the email until it has text.',
      letter: 'Letter',
      letterHelp:
        'Leave a blank line between paragraphs. An empty letter is left out of the email.',
      signature: 'Signature',
      photo: 'Photo',
    },
    text: {
      label: 'Text',
      description: 'A heading and a few paragraphs.',
      emptyCanvas: 'Empty text block. It stays out of the email until it has text.',
    },
    event_tiles: {
      label: 'Event tiles',
      description: 'Up to four upcoming events as big date tiles.',
      emptyCanvas: 'No events chosen yet. The block stays out of the email until it has one.',
      help: (max, { number }) => `Up to ${number(max)} events become the big date tiles.`,
      list: {
        label: 'Events',
        item: 'event',
        add: 'Add event',
        empty: 'No events yet.',
        emptyFromSource: (source) =>
          `No events yet. Pick from ${source} above, or add one by hand.`,
        limit: (max, { number }) => `Event tiles show up to ${number(max)} events.`,
      },
      timeOptional: 'Time (optional)',
      timePlaceholder: '6:30 PM',
      locationOptional: 'Location (optional)',
      linkPlaceholder: '/events',
      pickDetail: (event, { date }) =>
        [date(event.date), event.time, event.location].filter(Boolean).join(' · '),
    },
    name_list: {
      label: 'Name list',
      description: 'A numbered list of names, such as new members.',
      emptyCanvas: 'No names yet. The block stays out of the email until it has one.',
      intro: 'Intro',
      list: {
        label: 'Names',
        item: 'name',
        add: 'Add name',
        empty: 'No names yet.',
        emptyFromSource: (source) => `No names yet. Pick from ${source} above, or add one by hand.`,
      },
      secondLine: 'Second line (optional)',
      secondLinePlaceholder: 'Bakery · Joined Sept. 3',
    },
    sponsors: {
      label: 'Sponsors',
      description: 'A logo and a thank-you note for each sponsor.',
      emptyCanvas: 'No sponsors yet. The block stays out of the email until it has one.',
      list: {
        label: 'Sponsors',
        item: 'sponsor',
        add: 'Add sponsor',
        empty: 'No sponsors yet.',
        emptyFromSource: (source) =>
          `No sponsors yet. Pick from ${source} above, or add one by hand.`,
      },
      newMessage: 'Thank you for sponsoring!',
      sponsorName: 'Sponsor name',
      message: 'Thank-you message',
      logo: 'Logo',
    },
    post_list: {
      label: 'Post list',
      description: 'Up to three recent posts, each linking out.',
      emptyCanvas: 'No posts chosen yet. The block stays out of the email until it has one.',
      help: (max, { number }) => `Up to ${number(max)} posts, each with its title and summary.`,
      list: {
        label: 'Posts',
        item: 'post',
        add: 'Add post',
        empty: 'No posts yet.',
        emptyFromSource: (source) => `No posts yet. Pick from ${source} above, or add one by hand.`,
        limit: (max, { number }) => `A post list shows up to ${number(max)} posts.`,
      },
      kicker: 'Label (optional)',
      kickerPlaceholder: 'Announcement',
      excerpt: 'Summary',
      linkPlaceholder: '/news',
    },
    article: {
      label: 'Article',
      description: 'A short feature article with an image beside it.',
      emptyCanvas: 'Empty article. It stays out of the email until it has text.',
      kicker: 'Section heading',
      kickerHelp: 'The small label above the title, such as “Tips and tools”.',
      articleTitle: 'Article title',
      article: 'Article',
      linkPlaceholder: '/resources',
      image: 'Article image',
    },
    dated_list: {
      label: 'Dated list',
      description: 'Dated lines for a community calendar.',
      emptyCanvas: 'No dates listed yet. The block stays out of the email until it has one.',
      list: {
        label: 'Lines',
        item: 'line',
        add: 'Add line',
        empty: 'No lines yet.',
        emptyFromSource: (source) => `No lines yet. Pick from ${source} above, or add one by hand.`,
      },
      hint: 'Lines render as “Sept. 5 · Farmers market | Town square”. Lines with a sort date appear in date order; the rest follow in the order shown here.',
      datePlaceholder: 'Sept. 5',
      sortDate: 'Sort date (optional)',
      happening: 'What’s happening',
      happeningPlaceholder: 'Farmers market | Town square',
    },
    callout: {
      label: 'Callout',
      description: 'A short heading, a sentence or two and a button.',
      emptyCanvas: 'Empty callout. It stays out of the email until it has text.',
      needsLink: 'The button appears once it has a link.',
      linkPlaceholder: '/contact',
    },
    footer: {
      label: 'Footer',
      description: 'Contact details, links and the unsubscribe line.',
      emptyCanvas:
        'Empty footer. Add contact details or a line saying why readers receive this email.',
      note: 'Blank contact fields use the brand kit’s, so one brand kit change updates every issue.',
      address: 'Mailing address',
      phone: 'Phone',
      email: 'Email',
      fromBrand: (value) => `Uses the brand kit: ${value}`,
      brandSocial: (count, { number }) =>
        `None here, so the brand kit’s ${count === 1 ? 'link is' : `${number(count)} links are`} used.`,
      links: {
        label: 'Footer links',
        item: 'link',
        add: 'Add link',
        empty: 'No footer links yet.',
      },
      compliance: 'Compliance text',
      complianceHelp: 'Why readers get this email. The preference and unsubscribe links follow it.',
    },
    columns: {
      label: 'Columns',
      description: 'Two or three side-by-side cards.',
      emptyCanvas: 'No columns yet. The block stays out of the email until it has one.',
      list: {
        label: 'Columns',
        item: 'column',
        add: 'Add column',
        limit: (max, { number }) => `A columns block holds up to ${number(max)} columns.`,
      },
      hint: 'Two or three columns. They stack on phones.',
      summary: (block, { number }) =>
        block.columns.length === 1 ? '1 column' : `${number(block.columns.length)} columns`,
    },
    image_text: {
      label: 'Image + text',
      description: 'A picture beside a short story, with an optional link.',
      side: 'Picture side',
      left: 'Left',
      right: 'Right',
      linkPlaceholder: '/events',
    },
    button: {
      label: 'Button',
      description: 'A solid or outline button with a link.',
      emptyCanvas: 'Button with no label. It stays out of the email until it has one.',
      linkPlaceholder: '/events',
      linkHelp: 'Paths like /events become full links when the email is rendered.',
      style: 'Button style',
      solid: 'Solid',
      solidHint: 'Filled with the accent colour',
      outline: 'Outline',
      outlineHint: 'Accent border, clear inside',
    },
    divider: {
      label: 'Divider',
      description: 'A hairline or thick rule between sections.',
      thickness: 'Rule thickness',
      hairline: 'Hairline',
      thick: 'Thick',
      note: 'A divider has no text. Use the Appearance tab to change its colour and the space around it.',
      summary: (block) => block.thickness,
    },
    spacer: {
      label: 'Spacer',
      description: 'Empty breathing room, small to large.',
      size: 'Gap size',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      summary: (block) => block.size,
    },
    banner: {
      label: 'Banner',
      description: 'A wide hero image with a headline over or under it.',
      emptyCanvas: 'Add an image or a headline. Until then the email shows a plain band.',
      image: 'Banner image',
      headline: 'Headline (optional)',
      subheading: 'Subheading (optional)',
      buttonLabel: 'Button label (optional)',
      buttonLink: 'Button link (optional)',
      linkPlaceholder: '/events',
      overlay: 'Place the headline over the image',
      overlayNote:
        'Overlay text needs a darker picture to stay readable. Turn it off to put the headline underneath instead.',
    },
    image: {
      label: 'Image',
      description: 'A full-width picture with alt text.',
      image: 'Image',
      linkPlaceholder: '/gallery',
    },
    photo_grid: {
      label: 'Photo grid',
      description: 'Two to six captioned photos in a grid.',
      emptyCanvas: 'No photos yet. The block stays out of the email until it has one.',
      list: {
        label: 'Photos',
        item: 'photo',
        add: 'Add photo',
        limit: (max, { number }) => `A photo grid holds up to ${number(max)} photos.`,
      },
      hint: 'Two to six photos: three to a row when they divide by three, otherwise two.',
      summary: (block, { number }) =>
        block.photos.length === 1 ? '1 photo' : `${number(block.photos.length)} photos`,
    },
    quote: {
      label: 'Quote',
      description: 'One pull quote in large type, with an attribution.',
      emptyCanvas: 'Add the quote. The block stays out of the email until it has one.',
      quote: 'Quote',
      attribution: 'Who said it (optional)',
      attributionPlaceholder: 'Sam Rivera, Corner Bakery',
    },
    stats: {
      label: 'Numbers',
      description: 'Two to four big numbers with labels.',
      emptyCanvas: 'No numbers yet. The block stays out of the email until it has one.',
      labelPlaceholder: 'Label',
      list: {
        label: 'Numbers',
        item: 'number',
        add: 'Add number',
        limit: (max, { number }) => `A numbers block holds up to ${number(max)} numbers.`,
      },
      hint: 'Two to four numbers, side by side in the email.',
      number: 'Number',
      numberPlaceholder: '120',
      statLabelPlaceholder: 'Members',
    },
  },

  issues: {
    missing_alt: 'Add alt text so screen readers can describe the image.',
    missing_title: 'Add a title: it describes the image for screen readers.',
    missing_signature: 'Add a signature: it describes the photo for screen readers.',
    missing_photo_alt: 'Add alt text to every photo.',
    missing_sponsor_name: 'Name every sponsor: the name describes their logo for screen readers.',
    too_long: (field, max, { number }) =>
      `Keep the ${field.replace('_', ' ')} to ${number(max)} characters or fewer.`,
    too_many_events: (max, { number }) => `Choose at most ${number(max)} events.`,
    too_many_posts: (max, { number }) => `Choose at most ${number(max)} posts.`,
    column_count: (min, max, { number }) => `Use ${number(min)} or ${number(max)} columns.`,
    photo_count: (min, max, { number }) => `Use between ${number(min)} and ${number(max)} photos.`,
    number_count: (min, max, { number }) =>
      `Use between ${number(min)} and ${number(max)} numbers.`,
    missing_button_label: 'Give the button a label.',
    missing_button_link: 'Give the button a link.',
    missing_callout_link: 'Add a link so the button appears.',
  },

  lists: {
    row: (item, position, { number }) => `${capitalized(item)} ${number(position)}`,
    remove: (item, position, { number }) => `Remove ${item} ${number(position)}`,
    moveUp: (item, position, { number }) => `Move ${item} ${number(position)} up`,
    moveDown: (item, position, { number }) => `Move ${item} ${number(position)} down`,
    added: (item, position, { number }) => `${capitalized(item)} ${number(position)} added.`,
    removed: (item, position, { number }) => `${capitalized(item)} ${number(position)} removed.`,
    moved: (item, position, total, { number }) =>
      `${capitalized(item)} moved to position ${number(position)} of ${number(total)}.`,
  },

  sources: {
    pickFrom: (source, chosen, limit, { number }) =>
      `Pick from ${source} (${limit === undefined ? number(chosen) : `${number(chosen)}/${number(limit)}`})`,
    loading: (source) => `Loading ${source}…`,
    failed: (source, reason) => `${source} could not be loaded.${reason ? ` ${reason}` : ''}`,
    nothing: (source) => `Nothing from ${source} yet.`,
    nothingForDates: (source) => `Nothing from ${source} for this issue’s dates yet.`,
    full: 'That is as many as this block shows. Uncheck one to pick another.',
    from: (source) => `From ${source}`,
  },

  images: {
    label: 'Image',
    address: 'Image URL',
    choose: 'Choose image',
    replace: 'Replace image',
    remove: 'Remove image',
    uploadHint: (megabytes, { number }) => `JPEG, PNG or WebP up to ${number(megabytes)} MB.`,
    uploading: 'Uploading…',
    uploadingImage: 'Uploading the image…',
    uploaded: 'Image uploaded.',
    removed: 'Image removed.',
    wrongType: 'Use a JPEG, PNG, or WebP image.',
    tooLarge: (megabytes, { number }) => `Images must be ${number(megabytes)} MB or smaller.`,
    notHttps: 'Enter an image address that starts with https://.',
    uploadFailed: 'The image could not be uploaded. Try again.',
    broken: 'The image at this address could not be loaded. Check the address.',
    none: 'None',
    saved: 'Saved',
    cannotLoad: 'Can’t load',
  },

  socialLinks: {
    label: 'Social links',
    item: 'social link',
    add: 'Add social link',
    network: 'Network',
    link: 'Link',
    none: 'No social links yet.',
    networks: {
      facebook: 'Facebook',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      x: 'X',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      github: 'GitHub',
      website: 'Website',
    },
  },

  appearance: {
    chooseBlock: 'Choose a block on the canvas to change how it looks.',
    reset: 'Reset appearance',
    note: "Styling for this block only. Leave a field alone to keep the brand kit's styling.",
    background: 'Background',
    backgroundDefault: "the block's own background",
    textColor: 'Text colour',
    textColorDefault: "the brand kit's text colour",
    align: 'Alignment',
    padding: 'Vertical padding',
    fontSize: 'Text size',
    fullWidth: 'Edge-to-edge band',
    divider: 'Hairline under the block',
    alignments: { left: 'Left', center: 'Centre', right: 'Right' },
    paddings: { none: 'None', tight: 'Tight', normal: 'Normal', loose: 'Loose' },
    fontSizes: { small: 'Small', normal: 'Normal', large: 'Large' },
    swatches: {
      page: 'Page',
      ink: 'Ink',
      accent: 'Accent',
      highlight: 'Highlight',
      white: 'White',
    },
    summary: {
      none: 'Brand defaults',
      background: (color) => `background ${color}`,
      textColor: (color) => `text ${color}`,
      align: (align) => align,
      padding: (padding) => `${padding} padding`,
      fontSize: (size) => `${size} text`,
      fullWidth: 'full width',
      divider: 'divider',
    },
  },

  colors: {
    swatch: (name, hex) => `${name} ${hex}`,
    picker: (field) => `${field} colour picker`,
    hex: (field) => `${field} hex value`,
    hexPlaceholder: 'Default',
    reset: (field) => `Reset ${field.toLowerCase()} to the default`,
    overrides: 'Overrides the default. Six-digit hex, like #1f2937.',
    uses: (fallback) => `Uses ${fallback}.`,
    defaultFallback: 'the default',
    rejected: (typed, field, kept) =>
      `“${typed}” is not a six-digit hex colour such as #1f2937, so the ${field.toLowerCase()} colour stays ${kept}.`,
  },

  settings: {
    heading: 'Settings',
    subject: 'Subject',
    subjectHint: 'What an inbox shows first.',
    preheader: 'Preview line',
    preheaderHint: 'The line an inbox shows under the subject.',
    update: 'Update period',
    updating: 'Updating…',
    refreshHelp: (count, format) =>
      `This refreshes the ${blocks(count, format.number)} filled from your data for the dates above. Everything else stays as it is.`,
    noSources: 'No block here is filled from your data, so only the dates change.',
    confirmTitle: (count, format) => `Refresh ${blocks(count, format.number)} for the new dates?`,
    confirmDescription:
      'Blocks filled from your data are read again for these dates, and what they list changes to match. Everything else in the issue stays as it is.',
  },

  period: {
    legend: 'What this issue covers',
    from: 'From',
    upTo: 'Up to',
    coversHelp: (capped) =>
      `News, new members and other updates come from these dates.${capped ? ' An issue can only cover up to today.' : ''}`,
    lookahead: 'Look ahead for events until',
    lookaheadHelp: 'What is still to come, for lists of upcoming events.',
    errors: {
      missing_start: 'Choose the date this issue starts from.',
      start_after_end: 'The start date is after the end date.',
      missing_end: 'Choose the date this issue covers up to.',
      end_after_today:
        'An issue can only cover up to today — there is no news from the future yet.',
      missing_lookahead: 'Choose how far ahead to look for events.',
      lookahead_before_end: 'Look ahead to a date after the period this issue covers.',
    },
  },

  brandKit: {
    heading: 'Brand kit',
    note: 'Every issue is styled with these. Saving restyles every issue that has not gone out yet.',
    organisation: 'Organisation',
    name: 'Organisation name',
    nameHelp: 'The footer’s first line, and the header’s text when there is no logo.',
    logo: 'Logo',
    logoHelp: 'Wide logos read best in email.',
    colors: 'Colours',
    colorFields: {
      ink: { label: 'Ink', hint: 'Text and headings, and the dark bands and footer.' },
      accent: { label: 'Accent', hint: 'Buttons, small labels and big numbers.' },
      highlight: { label: 'Highlight', hint: 'The big day numbers on event tiles.' },
      page: { label: 'Page', hint: 'Behind the email, and the soft section background.' },
    },
    inkContrast: (ratio, minimum, { number }) =>
      `Ink on page is ${number(ratio, 1)}:1, below the ${number(minimum, 1)}:1 minimum for body text. Pick a darker ink or a lighter page.`,
    buttonContrast: (ratio, minimum, { number }) =>
      `Button labels on the accent colour are ${number(ratio, 1)}:1, below the ${number(minimum, 1)}:1 minimum. Try a darker or lighter accent.`,
    fonts: 'Fonts',
    headingFont: 'Heading font',
    bodyFont: 'Body font',
    fontSample: 'Font sample',
    sampleHeading: 'This month at a glance',
    sampleBody: 'Events, new faces and news, in your own colours and type.',
    contact: 'Contact',
    contactNote: 'Every footer uses these unless an issue gives its own.',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    save: 'Save brand kit',
    discard: 'Discard changes',
    saveFailed: 'The brand kit was not saved. Try again.',
    errors: {
      nameRequired: 'Enter the organisation name.',
      linkRequired: 'Add the link.',
      tooLong: (field, max, { number }) =>
        `Keep the ${BRAND_FIELD_WORDS[field]} to ${number(max)} characters or fewer.`,
      invalidEmail: 'Enter a valid email address.',
      invalidColor: (color) =>
        `Enter the ${color} colour as a six-digit hex colour such as #1f2937.`,
      invalidFont: (font, choices) => `Choose a ${font} font from: ${choices.join(', ')}.`,
      invalidNetwork: (choices) => `Choose the network from: ${choices.join(', ')}.`,
      logo: {
        unreadable: 'The logo is not in a format Blockletter can read.',
        asset_id: "The logo's asset id should be text.",
        not_text: 'The logo needs a web address.',
        not_web: 'The logo needs a web address starting with https://.',
        no_address: 'The logo has no address.',
      },
    },
  },

  templates: {
    legend: 'Layout',
    loading: 'Loading templates…',
    blank: 'Blank',
    blankDescription: 'Start from nothing and add the blocks you need.',
    noBlocks: 'No blocks',
    blocks: (count, { number }) => `${number(count)} block${count === 1 ? '' : 's'}`,
    builtIn: 'Built in',
    name: 'Template name',
    description: 'Description',
    rename: 'Rename',
    renameNamed: (template) => `Rename ${template}`,
    delete: 'Delete',
    deleteNamed: (template) => `Delete ${template}`,
    none: 'No saved templates yet — save one from any issue you like.',
    failed: 'That did not go through. Try again.',
    nameRequired: 'Give the template a name.',
    confirmDeleteTitle: (template) => `Delete the template “${template}”?`,
    confirmDeleteDescription:
      'Issues already started from it keep their layout. This can’t be undone.',
    confirmDelete: 'Delete template',
  },

  dialogs: {
    saveTemplate: {
      title: 'Save as template',
      description:
        'Saves this issue’s blocks as a layout to start new issues from. The content stays with this issue.',
      name: 'Template name',
      namePlaceholder: 'Event announcement',
      nameRequired: 'Give the template a name.',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Banner, story and one button',
      descriptionHint: 'One line, so it is easy to recognise when starting an issue.',
      save: 'Save template',
      failed: 'That template could not be saved. Try again.',
      suggestedName: (subject) => `${subject || 'Newsletter'} layout`,
    },
    newIssue: {
      title: 'New issue',
      description:
        'Pick the dates this issue covers and a layout to start from. Nothing is sent from here.',
      period: 'Period',
      presets: { 'this-month': 'This month', 'last-month': 'Last month', custom: 'Custom' },
      create: 'Create issue',
      creating: 'Creating…',
      chooseLayout: 'Choose a layout to start from.',
      failed: 'The issue could not be created. Try again.',
    },
    duplicate: {
      title: (name) => (name ? `Duplicate “${name}”` : 'Duplicate this issue'),
      description:
        'The copy keeps this issue’s layout and settings, and covers the dates you choose.',
      create: 'Create copy',
      copying: 'Copying…',
      failed: 'The copy could not be made. Try again.',
    },
  },

  preview: {
    region: 'Preview',
    frameTitle: 'Email preview',
    failed: 'The preview could not be rendered.',
    subject: 'Subject:',
    noSubject: 'No subject yet',
    options: 'Preview options',
    width: 'Preview width',
    desktop: 'Desktop',
    phone: 'Phone',
    widthLabel: (label, pixels) => `${label} · ${pixels}`,
    openInTab: 'Open in new tab',
    toCheck: (count, { number }) =>
      count === 1 ? '1 thing to check' : `${number(count)} things to check`,
    show: 'Show',
    hide: 'Hide',
  },

  warnings: {
    no_unsubscribe_url:
      "There is no unsubscribe link: pass unsubscribeUrl (an address or your email service's merge tag) so every recipient can opt out.",
    local_image:
      'An image is only stored in this browser (blob:/data: URL); email clients cannot load it. Upload it somewhere public before sending.',
    relative_link:
      'Some links are relative (such as "/events") and there is no baseUrl to resolve them against, so they will not work in an inbox.',
    missing_alt: (block) =>
      `An image in a "${block}" block has no alt text; add some so screen readers can describe it.`,
    unknown_block: (type) => `There is no definition for the "${type}" block, so it was left out.`,
    // Written as the renderer writes it, without a thousands separator.
    gmail_clip: (kilobytes) =>
      `Gmail clips messages larger than about 102 KB, and this one is ${kilobytes} KB: shorten or remove blocks so the end, with the unsubscribe link, is not cut off.`,
  },

  formatting: {
    toolbar: (field) => `${field} formatting`,
    bold: 'Bold',
    italic: 'Italic',
    link: 'Link',
    editLink: 'Edit link',
    bulletedList: 'Bulleted list',
    numberedList: 'Numbered list',
    clear: 'Clear formatting',
    tip: (command, shortcut) => `${command} (${shortcut})`,
    addLink: 'Add a link',
    address: 'Link address',
    textToShow: 'Text to show',
    textToShowHelp: 'Leave it blank to show the address.',
    apply: 'Add link',
    update: 'Update link',
    removeLink: 'Remove link',
    missingAddress: 'Enter the address to link to.',
    invalidAddress: 'Use a web address, such as https://example.org, or an email address.',
    unsupported:
      'This text has formatting the editor can’t keep, such as headings, images or colours. Editing it removes that; bold, italics, links and lists stay.',
  },

  toasts: {
    dismiss: 'Dismiss message',
    undo: 'Undo',
    deleted: (block) => `${block} deleted.`,
    tooManyBlocks: (max, { number }) =>
      `An issue holds at most ${number(max)} blocks. Delete one before adding another.`,
    refreshed: (source) => `Refreshed from ${source}.`,
    refreshChanged: (source) =>
      `The block changed while it was refreshing, so the ${source} data was not applied. Refresh it again to use it.`,
    refreshFailed: (source) => `The block could not be refreshed from ${source}. Try again.`,
    periodUpdated: (count, format) =>
      `Period updated. ${blocks(count, format.number)} refreshed for the new dates.`,
    periodRefreshFailed: (count, format) =>
      `${blocks(count, format.number)} could not be refreshed for the new dates. Refresh them again from the canvas.`,
    brandKitSaved: 'Brand kit saved.',
    templateSaved: 'Template saved. It is offered when you start the next issue.',
    templateRenamed: (template) => `Template renamed to “${template}”.`,
    templateDeleted: (template) => `Template “${template}” deleted.`,
    issueStarted: (template) => `Issue started from “${template}”.`,
    issueCopied: (name) => (name ? `Copied “${name}”.` : 'Issue copied.'),
  },
});

/** Every built-in block has its words: a block added to core fails to compile here until it does. */
type _EveryBlockHasWords = Assert<
  BuiltInBlockType extends keyof EditorMessages['blocks'] ? true : false
>;
type Assert<T extends true> = T;
