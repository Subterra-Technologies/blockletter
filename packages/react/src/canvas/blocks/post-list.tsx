import { LIMITS, type PostListBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { blockBackground } from '../canvas-theme';
import {
  CanvasSection,
  CanvasNote,
  bodyStyle,
  headingStyle,
  labelStyle,
  smallStyle,
} from './shared';

/** Up to three posts: a kicker, the title, the excerpt and the renderer's "Read more". */
export function PostListCanvas(canvas: BlockCanvasProps<PostListBlock>) {
  const { block, palette, fonts, px, labels } = canvas;
  const background = blockBackground(block, palette.card);
  const posts = block.items.slice(0, LIMITS.posts);
  const heading = block.heading.trim();
  return (
    <CanvasSection canvas={canvas} background={palette.card}>
      {heading ? <p style={headingStyle(canvas)}>{block.heading}</p> : null}
      {posts.length === 0 ? (
        <CanvasNote canvas={canvas} background={background}>
          No posts chosen yet. The block stays out of the email until it has one.
        </CanvasNote>
      ) : (
        posts.map((post, index) => (
          <div
            key={index}
            style={{ padding: '10px 0', borderBottom: `1px solid ${palette.border}` }}
          >
            {post.kicker?.trim() ? (
              <p style={{ ...labelStyle(canvas, background, 11), margin: '0 0 2px 0' }}>
                {post.kicker}
              </p>
            ) : null}
            <p
              style={{
                margin: '0 0 6px 0',
                fontFamily: fonts.heading,
                fontSize: px(19),
                lineHeight: 1.3,
                color: palette.heading,
              }}
            >
              {post.title}
            </p>
            {post.excerpt.trim() ? (
              <p style={{ ...bodyStyle(canvas), margin: '0 0 6px 0' }}>{post.excerpt}</p>
            ) : null}
            {post.url.trim() ? (
              <p style={smallStyle(canvas, palette.link)}>
                <span style={{ textDecoration: 'underline' }}>{labels.readMore}</span>
              </p>
            ) : null}
          </div>
        ))
      )}
    </CanvasSection>
  );
}
