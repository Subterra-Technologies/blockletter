import { defineBlock } from '../definition';
import { LIMITS } from '../limits';
import type { PostListBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, joinNames } from './shared';

/** Up to three recent posts or articles: kicker, linked title, excerpt and a "Read more" link. */
export const postListBlock = defineBlock<PostListBlock>({
  type: 'post_list',
  label: 'Post list',
  description: 'Up to three recent posts, each linking out.',
  group: 'content',
  create: () => ({ heading: 'Latest news', items: [] }),
  validate: (block, path) =>
    blockValidator(block, path, 'post_list')
      .string('heading')
      .array(
        'items',
        { label: 'posts', max: LIMITS.posts, tooMany: `Pick up to ${LIMITS.posts} posts.` },
        (item) => {
          item
            .string('title', { label: 'post title' })
            .string('excerpt')
            .string('url', { label: 'link' })
            .string('kicker', { optional: true, label: 'label' })
            .string('ref', { optional: true, label: 'source reference' });
        },
      ).issues,
  issues: (block) =>
    block.items.length > LIMITS.posts ? [`Choose at most ${LIMITS.posts} posts.`] : [],
  summary: (block) => joinNames(block.items.map((item) => item.title)) || block.heading,
  render(block, ctx) {
    const posts = block.items.slice(0, LIMITS.posts);
    if (posts.length === 0) return '';
    const heading = block.heading.trim();
    if (heading) ctx.text(heading.toUpperCase());
    const rows = posts
      .map((post) => {
        const href = post.url.trim() ? ctx.url(post.url) : '';
        const kicker = post.kicker?.trim() ?? '';
        const excerpt = post.excerpt.trim();
        ctx.text(
          kicker ? `${kicker}: ${post.title}` : post.title,
          ...(excerpt ? [post.excerpt] : []),
          ...(href ? [href] : []),
          '',
        );
        const title = href
          ? `<a href="${ctx.escape(href)}" style="color:${ctx.palette.heading};text-decoration:none;">${ctx.escape(post.title)}</a>`
          : ctx.escape(post.title);
        return (
          `<tr><td style="padding:10px 0;border-bottom:1px solid ${ctx.palette.border};">` +
          (kicker
            ? `<p style="margin:0 0 2px 0;font-family:${ctx.fonts.body};font-size:${ctx.px(11)}px;letter-spacing:1.5px;text-transform:uppercase;color:${ctx.palette.accentInk};font-weight:bold;">${ctx.escape(kicker)}</p>`
            : '') +
          `<p style="margin:0 0 6px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(19)}px;line-height:1.3;${href ? '' : `color:${ctx.palette.heading};`}">${title}</p>` +
          (excerpt
            ? `<p style="${ctx.bodyStyle()}margin:0 0 6px 0;">${ctx.escape(post.excerpt)}</p>`
            : '') +
          (href
            ? `<p style="${ctx.smallStyle(ctx.palette.link)}"><a href="${ctx.escape(href)}" style="color:${ctx.palette.link};">${ctx.escape(ctx.labels.readMore)}</a></p>`
            : '') +
          `</td></tr>`
        );
      })
      .join('');
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading) : '') + `${TABLE}${rows}</table>`,
    );
  },
});
