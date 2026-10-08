import type {
  BlockAlign,
  BlockFontSize,
  BlockPadding,
  ColumnsBlock,
  DividerBlock,
  ImageProblem,
  PeriodErrorCode,
  PeriodPreset,
  PhotoGridBlock,
  SocialNetwork,
  SpacerBlock,
} from '@subterra-technologies/blockletter';

/**
 * Every word the editor shows or says, as one object a host can translate. `enMessages` holds the
 * English; `messages` on `BlockletterRoot` (or `NewsletterEditor`) replaces any part of it.
 *
 * Text with values in it is a function (`Phrase`), never a template with placeholders, so the
 * order of the words and the choice of a plural are the translator's. Counts arrive as numbers;
 * the last argument is always the editor's `format`, which writes numbers and dates the way the
 * editor's `locale` does.
 *
 * What is not here, because it is not the editor's to say: the issue's own words (block content,
 * subject, preview line, and the sample words a new block starts with, from its definition's
 * `create`), anything the host passes in (a data source's label, a template's name, its own
 * blocks' labels and forms, `readOnlyReason`, error messages it throws), and the email's own
 * words, which `renderOptions.labels` sets for the preview and the canvas alike.
 */

/** How the editor writes numbers and dates, for its `locale`: the last argument of every phrase. */
export interface EditorFormat {
  /** The editor's `locale`; undefined when the host gave none and the editor writes English. */
  readonly locale: string | undefined;
  /** A number, with `fractionDigits` after the point when given. */
  readonly number: (value: number, fractionDigits?: number) => string;
  /**
   * A `YYYY-MM-DD` date as a short month and day: "Sept. 5" without a `locale`, else as the
   * locale writes it ("5 sept"). Anything that is not such a date comes back as it is.
   */
  readonly date: (iso: string) => string;
}

/** A message with values in it. The values come first, then the editor's `format`. */
export type Phrase<Values extends unknown[]> = (...args: [...Values, EditorFormat]) => string;

/** Every block has a name and a line describing it, in the palette and wherever it is named. */
interface BlockText {
  label: string;
  description: string;
}

/** The words of a list of items in a block's form: "Events", "Add event", "Event 2"… */
interface ListText {
  /** The list's name, above its rows. */
  label: string;
  /** One item, as `lists` puts it in a row's name ("event" in "Event 2" and "Remove event 2"). */
  item: string;
  /** The button that adds one. */
  add: string;
}

/** A list a data source can fill: what it says while it has nothing in it. */
interface SourcedListText extends ListText {
  empty: string;
  /** Empty, with a source to pick from above it. */
  emptyFromSource: Phrase<[source: string]>;
}

/** The fields a built-in block's issues call too long (`too_long`'s `values.field`). */
export type LongTextField = 'text' | 'article' | 'letter' | 'quote' | 'column_text';

/** The brand kit's text fields that have a length limit. */
export type BrandKitTextField = 'name' | 'address' | 'phone' | 'email' | 'website' | 'link';

export interface EditorMessages {
  /** Words several parts share. */
  common: {
    cancel: string;
    save: string;
    saving: string;
    remove: string;
    tryAgain: string;
    /** An item from a data source with no name. */
    untitled: string;
    /** The status of a hidden block, on the canvas and in the inspector. */
    hidden: string;
    /** A dialog's close button, read by screen readers only. */
    close: string;
    /** The name of a select's list of choices. */
    options: string;
    /** The placeholder of a field that takes a web address. */
    webAddress: string;
    /** A keyboard shortcut: `key` with Ctrl, or with ⌘ on Apple's systems, and Shift when asked. */
    shortcut: Phrase<[keys: { key: string; apple: boolean; shift?: boolean }]>;
    /** A size in pixels: a spacer's height, a preview's width. */
    pixels: Phrase<[pixels: number]>;
  };

  /** The editor's top bar, and the note under it while the issue is read-only. */
  topBar: {
    /** The group holding Canvas and Preview. */
    view: string;
    canvas: string;
    preview: string;
    more: string;
    saveAsTemplate: string;
    readOnly: string;
  };

  /** One pane at a time, in a narrow `fill` layout: its tabs, and the way back from editing. */
  panes: {
    label: string;
    blocks: string;
    canvas: string;
    edit: string;
    preview: string;
    backToCanvas: string;
  };

  /** Undo and redo, and what the toast after each says was undone or redone. */
  history: {
    undo: string;
    redo: string;
    /** `action` is one of the phrases below. */
    undid: Phrase<[action: string]>;
    redid: Phrase<[action: string]>;
    /** What a change did, finishing "Undid: …". `block` is the block's name. */
    added: Phrase<[block: string]>;
    moved: Phrase<[block: string]>;
    duplicated: Phrase<[block: string]>;
    deleted: Phrase<[block: string]>;
    showed: Phrase<[block: string]>;
    hid: Phrase<[block: string]>;
    edited: Phrase<[block: string]>;
    restyled: Phrase<[block: string]>;
    refreshed: Phrase<[block: string, source: string]>;
    periodUpdated: string;
    subjectEdited: string;
    preheaderEdited: string;
  };

  /** The block palette. */
  palette: {
    /** The palette's landmark. */
    region: string;
    heading: string;
    /** The heading while Insert above / below waits: `where` is `canvas.above` or `.below`. */
    insertHeading: Phrase<[where: string]>;
    cancelInsert: string;
    blocksUsed: Phrase<[count: number, max: number]>;
    hint: string;
    /** The hint where blocks can be dragged onto the canvas beside the palette. */
    dragHint: string;
    insertHint: string;
    /** The built-in groups; a host's own group keeps the name it gave. */
    groups: { content: string; layout: string; graphics: string };
  };

  /** The canvas: the issue drawn block by block. */
  canvas: {
    heading: string;
    /** How to use the canvas, read with it by screen readers. */
    instructions: string;
    emptyHeading: string;
    emptyHint: string;
    full: Phrase<[max: number]>;
    newBlockHere: string;
    /** A block filled from a data source. */
    autoFilled: string;
    /** Where an insertion goes, as Insert above / below says it. */
    above: Phrase<[block: string]>;
    below: Phrase<[block: string]>;
    /** Said once a block is in, or has moved: its new position, counting from 1. */
    inserted: Phrase<[block: string, position: number, total: number]>;
    moved: Phrase<[block: string, position: number, total: number]>;
    insertionPoint: Phrase<[where: string]>;
    /** A block's tooltip: its name, and the text it carries when it has some. */
    blockTitle: Phrase<[block: string, summary: string]>;
    unknownBlock: Phrase<[type: string]>;
    notDrawn: string;
    blockNotDrawn: Phrase<[block: string]>;
    /** A host's block whose email has nothing in it yet. */
    nothingYet: string;
  };

  /** The toolbar on the chosen block: each button's name, and its tooltip. */
  blockToolbar: {
    label: Phrase<[block: string]>;
    edit: Phrase<[block: string]>;
    editTip: string;
    moveUp: Phrase<[block: string]>;
    moveUpTip: string;
    moveDown: Phrase<[block: string]>;
    moveDownTip: string;
    insertAbove: Phrase<[block: string]>;
    insertAboveTip: string;
    insertBelow: Phrase<[block: string]>;
    insertBelowTip: string;
    show: Phrase<[block: string]>;
    showTip: string;
    hide: Phrase<[block: string]>;
    hideTip: string;
    duplicate: Phrase<[block: string]>;
    duplicateTip: string;
    refresh: Phrase<[block: string, source: string]>;
    refreshTip: Phrase<[source: string]>;
    delete: Phrase<[block: string]>;
    deleteTip: string;
  };

  /** The inspector: its tabs, and the Block tab around a block's form. */
  inspector: {
    region: string;
    tabs: { block: string; appearance: string; settings: string; brand: string };
    chooseBlock: string;
    filledFrom: Phrase<[source: string]>;
    readOnly: string;
    noEditor: Phrase<[type: string]>;
  };

  /** Labels several blocks' forms share. */
  fields: {
    heading: string;
    headingOptional: string;
    subheading: string;
    text: string;
    title: string;
    name: string;
    label: string;
    date: string;
    link: string;
    linkOptional: string;
    linkLabelOptional: string;
    buttonLabel: string;
    buttonLink: string;
    picture: string;
    pictureOptional: string;
    altText: string;
    altTextHelp: string;
    captionOptional: string;
  };

  /**
   * Each built-in block: its name and description, what the canvas says while it is empty, and
   * the words of its form. A host that replaces a built-in block's `label` or `description` in its
   * own definition keeps its own.
   */
  blocks: {
    header: BlockText & {
      emptyCanvas: string;
      issueLabel: string;
      issueLabelPlaceholder: string;
      logoText: string;
      logoTextHelp: string;
    };
    letter: BlockText & {
      emptyCanvas: string;
      letter: string;
      letterHelp: string;
      signature: string;
      photo: string;
    };
    text: BlockText & { emptyCanvas: string };
    event_tiles: BlockText & {
      emptyCanvas: string;
      help: Phrase<[max: number]>;
      list: SourcedListText & { limit: Phrase<[max: number]> };
      timeOptional: string;
      timePlaceholder: string;
      locationOptional: string;
      linkPlaceholder: string;
      /** An event as the data source picker lists it, under its title. */
      pickDetail: Phrase<[event: { date: string; time?: string; location?: string }]>;
    };
    name_list: BlockText & {
      emptyCanvas: string;
      intro: string;
      list: SourcedListText;
      secondLine: string;
      secondLinePlaceholder: string;
    };
    sponsors: BlockText & {
      emptyCanvas: string;
      list: SourcedListText;
      /** What a sponsor added by hand starts by saying. */
      newMessage: string;
      sponsorName: string;
      message: string;
      logo: string;
    };
    post_list: BlockText & {
      emptyCanvas: string;
      help: Phrase<[max: number]>;
      list: SourcedListText & { limit: Phrase<[max: number]> };
      kicker: string;
      kickerPlaceholder: string;
      excerpt: string;
      linkPlaceholder: string;
    };
    article: BlockText & {
      emptyCanvas: string;
      kicker: string;
      kickerHelp: string;
      articleTitle: string;
      article: string;
      linkPlaceholder: string;
      image: string;
    };
    dated_list: BlockText & {
      emptyCanvas: string;
      list: SourcedListText;
      hint: string;
      datePlaceholder: string;
      sortDate: string;
      happening: string;
      happeningPlaceholder: string;
    };
    callout: BlockText & {
      emptyCanvas: string;
      /** On the canvas, while the button has a label and no link. */
      needsLink: string;
      linkPlaceholder: string;
    };
    footer: BlockText & {
      emptyCanvas: string;
      note: string;
      address: string;
      phone: string;
      email: string;
      /** A blank contact field's placeholder: the brand kit's own value, used in its place. */
      fromBrand: Phrase<[value: string]>;
      /** No social links of the footer's own, while the brand kit has `count`. */
      brandSocial: Phrase<[count: number]>;
      links: ListText & { empty: string };
      compliance: string;
      complianceHelp: string;
    };
    columns: BlockText & {
      emptyCanvas: string;
      list: ListText & { limit: Phrase<[max: number]> };
      hint: string;
      /** The block's tooltip text on the canvas. */
      summary: Phrase<[block: ColumnsBlock]>;
    };
    image_text: BlockText & {
      side: string;
      left: string;
      right: string;
      linkPlaceholder: string;
    };
    button: BlockText & {
      emptyCanvas: string;
      linkPlaceholder: string;
      linkHelp: string;
      style: string;
      solid: string;
      solidHint: string;
      outline: string;
      outlineHint: string;
    };
    divider: BlockText & {
      thickness: string;
      hairline: string;
      thick: string;
      note: string;
      summary: Phrase<[block: DividerBlock]>;
    };
    spacer: BlockText & {
      size: string;
      small: string;
      medium: string;
      large: string;
      summary: Phrase<[block: SpacerBlock]>;
    };
    banner: BlockText & {
      emptyCanvas: string;
      image: string;
      headline: string;
      subheading: string;
      buttonLabel: string;
      buttonLink: string;
      linkPlaceholder: string;
      overlay: string;
      overlayNote: string;
    };
    image: BlockText & { image: string; linkPlaceholder: string };
    photo_grid: BlockText & {
      emptyCanvas: string;
      list: ListText & { limit: Phrase<[max: number]> };
      hint: string;
      summary: Phrase<[block: PhotoGridBlock]>;
    };
    quote: BlockText & {
      emptyCanvas: string;
      quote: string;
      attribution: string;
      attributionPlaceholder: string;
    };
    stats: BlockText & {
      emptyCanvas: string;
      /** On the canvas, in place of a number's missing label. */
      labelPlaceholder: string;
      list: ListText & { limit: Phrase<[max: number]> };
      hint: string;
      number: string;
      numberPlaceholder: string;
      statLabelPlaceholder: string;
    };
  };

  /**
   * The soft warnings the inspector shows about a built-in block, by the code core gives each
   * (`blockIssueDetails`). A host's own block says its own.
   */
  issues: {
    missing_alt: string;
    missing_title: string;
    missing_signature: string;
    missing_photo_alt: string;
    missing_sponsor_name: string;
    too_long: Phrase<[field: LongTextField, max: number]>;
    too_many_events: Phrase<[max: number]>;
    too_many_posts: Phrase<[max: number]>;
    column_count: Phrase<[min: number, max: number]>;
    photo_count: Phrase<[min: number, max: number]>;
    number_count: Phrase<[min: number, max: number]>;
    missing_button_label: string;
    missing_button_link: string;
    missing_callout_link: string;
  };

  /** A list of items in a block's form; `item` is the list's own word for one ("event"). */
  lists: {
    /** A row's name: "Event 2". */
    row: Phrase<[item: string, position: number]>;
    remove: Phrase<[item: string, position: number]>;
    moveUp: Phrase<[item: string, position: number]>;
    moveDown: Phrase<[item: string, position: number]>;
    added: Phrase<[item: string, position: number]>;
    removed: Phrase<[item: string, position: number]>;
    moved: Phrase<[item: string, position: number, total: number]>;
  };

  /** Picking a list block's items from a data source. */
  sources: {
    pickFrom: Phrase<[source: string, chosen: number, limit: number | undefined]>;
    loading: Phrase<[source: string]>;
    /** `reason` is what the source said went wrong, or ''. */
    failed: Phrase<[source: string, reason: string]>;
    nothing: Phrase<[source: string]>;
    nothingForDates: Phrase<[source: string]>;
    full: string;
    /** Beside an item in a list that the source supplied. */
    from: Phrase<[source: string]>;
  };

  /** An image field: upload, address and removal. */
  images: {
    /** The field's name when its form gives none. */
    label: string;
    address: string;
    choose: string;
    replace: string;
    remove: string;
    uploadHint: Phrase<[megabytes: number]>;
    uploading: string;
    uploadingImage: string;
    uploaded: string;
    removed: string;
    wrongType: string;
    tooLarge: Phrase<[megabytes: number]>;
    notHttps: string;
    uploadFailed: string;
    broken: string;
    /** In the thumbnail's place: no image, one with no preview, one that will not load. */
    none: string;
    saved: string;
    cannotLoad: string;
  };

  /** Social links, in the footer's form and the brand kit's. */
  socialLinks: {
    label: string;
    item: string;
    add: string;
    network: string;
    link: string;
    none: string;
    networks: Record<SocialNetwork, string>;
  };

  /** The Appearance tab: one block's look. */
  appearance: {
    chooseBlock: string;
    reset: string;
    note: string;
    background: string;
    backgroundDefault: string;
    textColor: string;
    textColorDefault: string;
    align: string;
    padding: string;
    fontSize: string;
    fullWidth: string;
    divider: string;
    alignments: Record<BlockAlign, string>;
    paddings: Record<BlockPadding, string>;
    fontSizes: Record<BlockFontSize, string>;
    swatches: { page: string; ink: string; accent: string; highlight: string; white: string };
    /** The line under the block's name: what is overridden, or that nothing is. */
    summary: {
      none: string;
      background: Phrase<[color: string]>;
      textColor: Phrase<[color: string]>;
      align: Phrase<[align: BlockAlign]>;
      padding: Phrase<[padding: BlockPadding]>;
      fontSize: Phrase<[size: BlockFontSize]>;
      fullWidth: string;
      divider: string;
    };
  };

  /** A colour field: swatches, the browser's picker and a hex box. */
  colors: {
    swatch: Phrase<[name: string, hex: string]>;
    picker: Phrase<[field: string]>;
    hex: Phrase<[field: string]>;
    hexPlaceholder: string;
    reset: Phrase<[field: string]>;
    overrides: string;
    /** `fallback` is what applies instead, such as `appearance.backgroundDefault`. */
    uses: Phrase<[fallback: string]>;
    defaultFallback: string;
    /** A hex code the brand kit could not read, and the colour it keeps. */
    rejected: Phrase<[typed: string, field: string, kept: string]>;
  };

  /** The Settings tab: the issue's subject, preview line and dates. */
  settings: {
    heading: string;
    subject: string;
    subjectHint: string;
    preheader: string;
    preheaderHint: string;
    update: string;
    updating: string;
    refreshHelp: Phrase<[count: number]>;
    noSources: string;
    confirmTitle: Phrase<[count: number]>;
    confirmDescription: string;
  };

  /** The dates an issue covers, wherever they are asked for. */
  period: {
    legend: string;
    from: string;
    upTo: string;
    /** Under the dates; `capped` while an issue can cover no further than today. */
    coversHelp: Phrase<[capped: boolean]>;
    lookahead: string;
    lookaheadHelp: string;
    /** By the code core gives each problem (`periodErrorCodes`). */
    errors: Record<PeriodErrorCode, string>;
  };

  /** The Brand kit tab. */
  brandKit: {
    heading: string;
    note: string;
    organisation: string;
    name: string;
    nameHelp: string;
    logo: string;
    logoHelp: string;
    colors: string;
    colorFields: Record<'ink' | 'accent' | 'highlight' | 'page', { label: string; hint: string }>;
    inkContrast: Phrase<[ratio: number, minimum: number]>;
    buttonContrast: Phrase<[ratio: number, minimum: number]>;
    fonts: string;
    headingFont: string;
    bodyFont: string;
    fontSample: string;
    sampleHeading: string;
    sampleBody: string;
    contact: string;
    contactNote: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    save: string;
    discard: string;
    saveFailed: string;
    /** The problems `validateBrandKit` finds, by code and field; others keep core's English. */
    errors: {
      nameRequired: string;
      linkRequired: string;
      tooLong: Phrase<[field: BrandKitTextField, max: number]>;
      invalidEmail: string;
      invalidColor: Phrase<[color: 'ink' | 'accent' | 'highlight' | 'page']>;
      invalidFont: Phrase<[font: 'heading' | 'body', choices: readonly string[]]>;
      invalidNetwork: Phrase<[choices: readonly string[]]>;
      logo: Record<ImageProblem, string>;
    };
  };

  /** The layouts an issue can start from. */
  templates: {
    legend: string;
    loading: string;
    blank: string;
    blankDescription: string;
    noBlocks: string;
    blocks: Phrase<[count: number]>;
    builtIn: string;
    name: string;
    description: string;
    rename: string;
    renameNamed: Phrase<[template: string]>;
    delete: string;
    deleteNamed: Phrase<[template: string]>;
    none: string;
    failed: string;
    nameRequired: string;
    confirmDeleteTitle: Phrase<[template: string]>;
    confirmDeleteDescription: string;
    confirmDelete: string;
  };

  /** The editor's dialogs. */
  dialogs: {
    saveTemplate: {
      title: string;
      description: string;
      name: string;
      namePlaceholder: string;
      nameRequired: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      descriptionHint: string;
      save: string;
      failed: string;
      /** The name it suggests, from the issue's subject ('' when it has none). */
      suggestedName: Phrase<[subject: string]>;
    };
    newIssue: {
      title: string;
      description: string;
      period: string;
      presets: Record<PeriodPreset, string>;
      create: string;
      creating: string;
      chooseLayout: string;
      failed: string;
    };
    duplicate: {
      /** `name` is what the host calls the issue, when it says. */
      title: Phrase<[name: string | undefined]>;
      description: string;
      create: string;
      copying: string;
      failed: string;
    };
  };

  /** The preview of the email as it will arrive. */
  preview: {
    region: string;
    frameTitle: string;
    failed: string;
    subject: string;
    noSubject: string;
    options: string;
    width: string;
    desktop: string;
    phone: string;
    /** A width's full name: its label and its size in pixels. */
    widthLabel: Phrase<[label: string, pixels: string]>;
    openInTab: string;
    toCheck: Phrase<[count: number]>;
    show: string;
    hide: string;
  };

  /**
   * The renderer's warnings in the preview, by the code core gives each (`warningDetails`). A
   * warning a host's own block gives is shown in its words.
   */
  warnings: {
    no_unsubscribe_url: string;
    local_image: string;
    relative_link: string;
    missing_alt: Phrase<[block: string]>;
    unknown_block: Phrase<[type: string]>;
    gmail_clip: Phrase<[kilobytes: number]>;
  };

  /** Formatted text: its toolbar, its link form, and its notes. */
  formatting: {
    /** The toolbar's name, after the field it formats. */
    toolbar: Phrase<[field: string]>;
    bold: string;
    italic: string;
    link: string;
    editLink: string;
    bulletedList: string;
    numberedList: string;
    clear: string;
    /** A button's tooltip when it has a shortcut. */
    tip: Phrase<[command: string, shortcut: string]>;
    addLink: string;
    address: string;
    textToShow: string;
    textToShowHelp: string;
    apply: string;
    update: string;
    removeLink: string;
    missingAddress: string;
    invalidAddress: string;
    unsupported: string;
  };

  /** The editor's short messages, bottom right. */
  toasts: {
    dismiss: string;
    undo: string;
    deleted: Phrase<[block: string]>;
    tooManyBlocks: Phrase<[max: number]>;
    refreshed: Phrase<[source: string]>;
    refreshChanged: Phrase<[source: string]>;
    refreshFailed: Phrase<[source: string]>;
    periodUpdated: Phrase<[count: number]>;
    periodRefreshFailed: Phrase<[count: number]>;
    brandKitSaved: string;
    templateSaved: string;
    templateRenamed: Phrase<[template: string]>;
    templateDeleted: Phrase<[template: string]>;
    issueStarted: Phrase<[template: string]>;
    issueCopied: Phrase<[name: string | undefined]>;
  };
}

/** Any part of `EditorMessages`, to the depth needed: everything left out stays English. */
export type EditorMessageOverrides = DeepPartial<EditorMessages>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};
