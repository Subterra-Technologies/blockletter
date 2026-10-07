import { describe, expect, it, vi } from 'vitest';
import { blockEditor, sameBlock, withImage, withOptional } from '../../src/inspector/editor-base';
import { testBlock } from '../helpers/fixtures';

describe('sameBlock', () => {
  it('compares structurally', () => {
    const block = testBlock('text');
    expect(sameBlock(block, { ...block })).toBe(true);
    expect(sameBlock(block, { ...block, hidden: true })).toBe(false);
  });
});

describe('blockEditor', () => {
  it('emits a merged block when a patch changes something', () => {
    const onChange = vi.fn();
    const block = testBlock('button');
    blockEditor(block, onChange).patch({ label: 'Join us' });
    expect(onChange).toHaveBeenCalledWith({ ...block, label: 'Join us' });
  });

  it('emits nothing for a change that changes nothing, so a saving host never loops', () => {
    const onChange = vi.fn();
    const block = testBlock('button');
    const { commit, patch } = blockEditor(block, onChange);
    patch({ label: block.label });
    commit({ ...block });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('withOptional', () => {
  const image = testBlock('image', { alt: 'A', caption: 'old' });

  it('sets a non-blank value and drops a blank one', () => {
    expect(withOptional(image, 'caption', 'new')).toMatchObject({ caption: 'new' });
    expect('caption' in withOptional(image, 'caption', '   ')).toBe(false);
    expect('caption' in withOptional(image, 'caption', undefined)).toBe(false);
  });

  it('does not change the block it is given', () => {
    withOptional(image, 'caption', undefined);
    expect(image.caption).toBe('old');
  });
});

describe('withImage', () => {
  it('sets an image, or drops the field when it was removed', () => {
    const image = testBlock('image');
    const withPicture = withImage(image, 'image', { url: 'https://photos.example/a.jpg' });
    expect(withPicture.image).toEqual({ url: 'https://photos.example/a.jpg' });
    expect('image' in withImage(withPicture, 'image', undefined)).toBe(false);
    expect(withPicture.image).toEqual({ url: 'https://photos.example/a.jpg' });
  });
});
