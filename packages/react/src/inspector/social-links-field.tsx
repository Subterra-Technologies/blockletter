import type { ReactNode } from 'react';
import {
  DEFAULT_LABELS,
  SOCIAL_NETWORKS,
  type SocialLink,
  type SocialNetwork,
} from '@subterra-technologies/blockletter';
import { SelectField, TextField } from './editor-fields';
import { ItemList } from './item-list';

/** What a network is called on screen: the renderer's own name for it, so the two agree. */
export const socialNetworkLabel = (network: SocialNetwork): string =>
  network === 'website' ? 'Website' : DEFAULT_LABELS[network];

const NETWORK_OPTIONS = SOCIAL_NETWORKS.map((network) => ({
  value: network,
  label: socialNetworkLabel(network),
}));

/**
 * Social links as rows of a network and its address, for the footer and the brand kit. A new
 * row starts on the first network not yet listed, since a second Facebook link is rarely meant.
 */
export function SocialLinksField({
  links,
  onChange,
  label = 'Social links',
  empty,
  hint,
  urlErrors = [],
}: {
  links: readonly SocialLink[];
  onChange: (links: SocialLink[]) => void;
  label?: string;
  empty?: ReactNode;
  hint?: ReactNode;
  /** An error per row's address, by row. */
  urlErrors?: readonly (string | undefined)[];
}) {
  return (
    <ItemList
      label={label}
      noun="social link"
      variant="line"
      items={links}
      onChange={onChange}
      create={() => ({
        network:
          SOCIAL_NETWORKS.find((network) => !links.some((link) => link.network === network)) ??
          'website',
        url: '',
      })}
      addLabel="Add social link"
      empty={empty}
      hint={hint}
      renderItem={(link, update, index) => (
        <>
          <SelectField
            label="Network"
            value={link.network}
            options={NETWORK_OPTIONS}
            onChange={(network) => update({ network })}
          />
          <TextField
            label="Link"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={link.url}
            error={urlErrors[index]}
            onChange={(url) => update({ url })}
          />
        </>
      )}
    />
  );
}
