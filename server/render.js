/**
 * Server-side page rendering dispatcher.
 */
import { layout } from './layout.js';
import { homePage, servicesPage, quotePage, bookPage, contactPage, aboutPage, notFoundPage } from '../pages/marketing.js';
import { trackPage, adminPage } from '../pages/portal.js';

export function renderPage(name, ctx) {
  const builders = {
    home: homePage, services: servicesPage, quote: quotePage, book: bookPage,
    track: trackPage, admin: adminPage, contact: contactPage, about: aboutPage, '404': notFoundPage,
  };
  const builder = builders[name] || notFoundPage;
  const page = builder(ctx);
  return layout({
    title: page.title,
    desc: page.desc,
    active: page.active || '',
    content: page.content,
    demo: (ctx.backend || 'demo') === 'demo',
  });
}
