import type { ReactNode } from 'react';
import { SOCIAL_NETWORKS, type SocialLink } from '@subterra-technologies/blockletter';
import { useEditorMessages } from '../i18n/context';
import { SelectField, TextField } from './editor-fields';
import { ItemList } from './item-list';

/**
 * Social links as rows of a network and its address, for the footer and the brand kit. A new
 * row starts on the first network not yet listed, since a second Facebook link is rarely meant.
 *
 * A network is called what the editor's messages call it, which in English is the renderer's own
 * name for it, so the form and the email agree.
 */
export function SocialLinksField({
  links,
  onChange,
  label,
  empty,
  hint,
  urlErrors = [],
}: {
  links: readonly SocialLink[];
  onChange: (links: SocialLink[]) => void;
  /** Default: the messages' "Social links". */
  label?: string;
  empty?: ReactNode;
  hint?: ReactNode;
  /** An error per row's address, by row. */
  urlErrors?: readonly (string | undefined)[];
}) {
  const { socialLinks: words, common } = useEditorMessages();
  const networks = SOCIAL_NETWORKS.map((network) => ({
    value: network,
    label: words.networks[network],
  }));
  return (
    <ItemList
      words={{ label: label ?? words.label, item: words.item, add: words.add }}
      variant="line"
      items={links}
      onChange={onChange}
      create={() => ({
        network:
          SOCIAL_NETWORKS.find((network) => !links.some((link) => link.network === network)) ??
          'website',
        url: '',
      })}
      empty={empty}
      hint={hint}
      renderItem={(link, update, index) => (
        <>
          <SelectField
            label={words.network}
            value={link.network}
            options={networks}
            onChange={(network) => update({ network })}
          />
          <TextField
            label={words.link}
            type="url"
            inputMode="url"
            placeholder={common.webAddress}
            value={link.url}
            error={urlErrors[index]}
            onChange={(url) => update({ url })}
          />
        </>
      )}
    />
  );
}
