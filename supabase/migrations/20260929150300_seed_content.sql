-- Phase 4 seed content: the North / Co homepage (sections in the order of docs/design/), the
-- About, Services, Our Impact and Contact pages, and the header/footer menus. Image fields are
-- empty; `pnpm seed:media` uploads seed/media/ and fills them. Page ids are fixed so links and
-- seed:media can refer to them. Nothing is seeded when pages or menu items already exist.

do $seed$
begin
  if exists (select 1 from public.pages) then
    raise notice 'Pages already exist; skipping the page seed.';
    return;
  end if;
  insert into public.pages (id, title, slug, is_home, seo_title) values
    ('a0000000-0000-4000-8000-000000000001', 'Home', 'home', true, null);
  insert into public.page_sections (page_id, type, sort_order, background, padding, anchor_id, props) values
    ('a0000000-0000-4000-8000-000000000001', 'hero', 0, 'white', 'none', null,
     '{"eyebrow": "A different kind of partner", "headline": "Good ideas\ndeserve", "accentLine": "great execution.", "text": "Clear thinking, practical solutions, and the right people beside you. Let’s make your next chapter your strongest yet.", "primary": {"label": "Explore our services", "link": {"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000003"}}, "secondary": {"label": "Get to know us", "link": {"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000002"}}, "image": null, "sideText": "Strategy · People · Progress", "showScrollIndicator": true}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'image_with_text', 1, 'white', 'normal', null,
     '{"image": null, "showFrame": true, "statValue": "25+", "statLabel": "Years of experience", "eyebrow": "Who we are", "heading": "Built around your ambitions.", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Every organization has its own story. We listen first, connect the dots, and bring the expertise that helps you move forward with confidence."}]}]}, "features": [{"icon": "target", "title": "Focused on what matters", "text": "Clear priorities and considered action."}, {"icon": "handshake", "title": "People before process", "text": "Relationships that make the work better."}], "button": {"label": "More about us", "link": {"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000002"}}, "imagePosition": "left"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'value_strip', 2, 'navy', 'compact', null,
     '{"items": [{"icon": "lightbulb", "title": "Fresh perspective", "text": "New thinking grounded in what works."}, {"icon": "target", "title": "Purposeful plans", "text": "A clear path from idea to action."}, {"icon": "handshake", "title": "True partnership", "text": "Real people invested in your goals."}, {"icon": "trending-up", "title": "Lasting progress", "text": "Solutions built to keep moving."}]}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'card_grid', 3, 'light', 'normal', null,
     '{"eyebrow": "What we do", "heading": "Expertise for every next step.", "intro": "Choose the support that fits your business today. Add more as you grow.", "columns": "3", "showNumbers": true, "cards": [{"icon": "chart-growth", "title": "Growth Strategy", "text": "Find opportunities and build a practical plan to reach them.", "link": {"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "growth-strategy"}}, {"icon": "landmark", "title": "Financial Guidance", "text": "Turn complex decisions into confident next steps.", "link": {"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "financial-guidance"}}, {"icon": "megaphone", "title": "Marketing & Brand", "text": "Connect your story with the people who matter.", "link": {"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "marketing-brand"}}, {"icon": "users", "title": "People & Culture", "text": "Create teams and experiences that thrive.", "link": {"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "people-culture"}}, {"icon": "shield-check", "title": "Risk & Operations", "text": "Strengthen the systems behind your success.", "link": {"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "risk-operations"}}, {"icon": "sparkles", "title": "Digital Experiences", "text": "Make technology feel effortless for customers.", "link": {"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "digital-experiences"}}]}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'stats', 4, 'navy', 'normal', null,
     '{"eyebrow": "The difference is in the details", "heading": "Progress you can feel.", "text": "Good work is measured by the relationships we build and the results we help create.", "link": {"label": "Work with us", "link": {"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000005"}}, "stats": [{"value": "25+", "label": "Years of experience"}, {"value": "250+", "label": "Projects delivered"}, {"value": "98%", "label": "Client satisfaction"}, {"value": "12", "label": "Industry specialties"}]}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'testimonial', 5, 'white', 'normal', null,
     '{"image": null, "eyebrow": "Client stories", "heading": "The best work starts with trust.", "quote": "They took the time to understand where we wanted to go, then helped us make it happen. It felt like having an extension of our own team.", "authorName": "Alex Morgan", "authorTitle": "Founder, Sample Company"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'cta_banner', 6, 'accent', 'compact', null,
     '{"eyebrow": "Let’s build something better", "heading": "Ready to make your next move?", "button": {"label": "Start a conversation", "link": {"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000005"}}}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'intro_image', 7, 'white', 'normal', null,
     '{"eyebrow": "Meet the people", "heading": "Experience with a human touch.", "text": "A team that listens closely, thinks boldly, and cares about the outcome.", "link": {"label": "Meet the team", "link": {"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000002"}}, "image": null}'::jsonb),
    ('a0000000-0000-4000-8000-000000000001', 'module_feed', 8, 'light', 'normal', null,
     '{"eyebrow": "Fresh perspectives", "heading": "Ideas worth sharing.", "viewAll": {"label": "All insights", "link": {"kind": "module", "moduleKey": "blog", "path": "/blog"}}, "source": "blog", "count": "3"}'::jsonb);
  perform public._publish_page('a0000000-0000-4000-8000-000000000001', null);

  insert into public.pages (id, title, slug, is_home, seo_title) values
    ('a0000000-0000-4000-8000-000000000002', 'About', 'about', false, 'About us');
  insert into public.page_sections (page_id, type, sort_order, background, padding, anchor_id, props) values
    ('a0000000-0000-4000-8000-000000000002', 'hero', 0, 'white', 'none', null,
     '{"eyebrow": "About us", "headline": "A different kind", "accentLine": "of partner.", "text": "Clear thinking, practical solutions, and the right people beside you.", "primary": {"label": "", "link": null}, "secondary": {"label": "", "link": null}, "image": null, "sideText": "", "showScrollIndicator": false}'::jsonb),
    ('a0000000-0000-4000-8000-000000000002', 'rich_text', 1, 'white', 'normal', null,
     '{"eyebrow": "About us", "heading": "Built around the people we serve.", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Every organization has its own story. We listen first, connect the dots, and bring the expertise that helps you move forward with confidence."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Tell your story here: who you are, what you believe, and how you help."}]}]}, "width": "narrow"}'::jsonb);
  perform public._publish_page('a0000000-0000-4000-8000-000000000002', null);

  insert into public.pages (id, title, slug, is_home, seo_title) values
    ('a0000000-0000-4000-8000-000000000003', 'Services', 'services', false, 'Services');
  insert into public.page_sections (page_id, type, sort_order, background, padding, anchor_id, props) values
    ('a0000000-0000-4000-8000-000000000003', 'hero', 0, 'white', 'none', null,
     '{"eyebrow": "What we do", "headline": "Expertise for every", "accentLine": "next step.", "text": "Practical expertise. Thoughtful solutions. Meaningful progress.", "primary": {"label": "", "link": null}, "secondary": {"label": "", "link": null}, "image": null, "sideText": "", "showScrollIndicator": false}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'rich_text', 1, 'white', 'normal', null,
     '{"eyebrow": "What we do", "heading": "Built around your business.", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Every engagement starts with listening. From strategy to execution, we bring the right expertise at the right time."}]}]}, "width": "narrow"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'rich_text', 2, 'white', 'compact', 'growth-strategy',
     '{"eyebrow": "What we do", "heading": "Growth Strategy", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Find opportunities and build a practical plan to reach them."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Describe how you help with growth strategy: the problems you solve, how you work, and the results clients can expect."}]}]}, "width": "narrow"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'rich_text', 3, 'white', 'compact', 'financial-guidance',
     '{"eyebrow": "What we do", "heading": "Financial Guidance", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Turn complex decisions into confident next steps."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Describe how you help with financial guidance: the problems you solve, how you work, and the results clients can expect."}]}]}, "width": "narrow"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'rich_text', 4, 'white', 'compact', 'marketing-brand',
     '{"eyebrow": "What we do", "heading": "Marketing & Brand", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Connect your story with the people who matter."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Describe how you help with marketing and brand: the problems you solve, how you work, and the results clients can expect."}]}]}, "width": "narrow"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'rich_text', 5, 'white', 'compact', 'people-culture',
     '{"eyebrow": "What we do", "heading": "People & Culture", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Create teams and experiences that thrive."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Describe how you help with people and culture: the problems you solve, how you work, and the results clients can expect."}]}]}, "width": "narrow"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'rich_text', 6, 'white', 'compact', 'risk-operations',
     '{"eyebrow": "What we do", "heading": "Risk & Operations", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Strengthen the systems behind your success."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Describe how you help with risk and operations: the problems you solve, how you work, and the results clients can expect."}]}]}, "width": "narrow"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'rich_text', 7, 'white', 'compact', 'digital-experiences',
     '{"eyebrow": "What we do", "heading": "Digital Experiences", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Make technology feel effortless for customers."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Describe how you help with digital experiences: the problems you solve, how you work, and the results clients can expect."}]}]}, "width": "narrow"}'::jsonb);
  perform public._publish_page('a0000000-0000-4000-8000-000000000003', null);

  insert into public.pages (id, title, slug, is_home, seo_title) values
    ('a0000000-0000-4000-8000-000000000004', 'Our Impact', 'our-impact', false, 'Our Impact');
  insert into public.page_sections (page_id, type, sort_order, background, padding, anchor_id, props) values
    ('a0000000-0000-4000-8000-000000000004', 'hero', 0, 'white', 'none', null,
     '{"eyebrow": "Our impact", "headline": "Progress you can", "accentLine": "measure.", "text": "Real outcomes for the people and organizations we serve.", "primary": {"label": "", "link": null}, "secondary": {"label": "", "link": null}, "image": null, "sideText": "", "showScrollIndicator": false}'::jsonb),
    ('a0000000-0000-4000-8000-000000000004', 'rich_text', 1, 'white', 'normal', null,
     '{"eyebrow": "Our impact", "heading": "Results that last.", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Share the difference you make: client stories, outcomes, and the numbers behind them."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Tell your story here: what changed for the people you worked with, and why it matters."}]}]}, "width": "narrow"}'::jsonb);
  perform public._publish_page('a0000000-0000-4000-8000-000000000004', null);

  insert into public.pages (id, title, slug, is_home, seo_title) values
    ('a0000000-0000-4000-8000-000000000005', 'Contact', 'contact', false, 'Contact us');
  insert into public.page_sections (page_id, type, sort_order, background, padding, anchor_id, props) values
    ('a0000000-0000-4000-8000-000000000005', 'hero', 0, 'white', 'none', null,
     '{"eyebrow": "Contact", "headline": "Let’s talk about", "accentLine": "what’s next.", "text": "Tell us about your goals and we’ll help you find the right next step.", "primary": {"label": "", "link": null}, "secondary": {"label": "", "link": null}, "image": null, "sideText": "", "showScrollIndicator": false}'::jsonb),
    ('a0000000-0000-4000-8000-000000000005', 'rich_text', 1, 'white', 'compact', null,
     '{"eyebrow": "Get in touch", "heading": "We’d love to hear from you.", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Whether you have a clear plan or just an idea, we’re happy to talk it through. Send us a message and we’ll get back to you within one business day."}]}]}, "width": "narrow"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000005', 'contact_form', 2, 'white', 'normal', null,
     '{"eyebrow": "Let’s connect", "heading": "Tell us what you have in mind.", "text": "Share a little about your goals. We’ll help you find the right next step.", "showPhone": true, "showCompany": false, "submitLabel": "Send message", "successMessage": "Thanks for reaching out. We’ll get back to you within one business day.", "showDetails": true, "detailsEyebrow": "Here to help", "detailsHeading": "Real people. Thoughtful answers.", "detailsText": "We’re here to listen, understand your challenges, and point you in the right direction."}'::jsonb);
  perform public._publish_page('a0000000-0000-4000-8000-000000000005', null);

end;
$seed$;

do $menus$
declare
  header uuid := (select id from public.menus where key = 'header');
  explore uuid := (select id from public.menus where key = 'footer_1');
  services uuid := (select id from public.menus where key = 'footer_2');
begin
  if exists (select 1 from public.menu_items) then
    raise notice 'Menus already have items; skipping the menu seed.';
    return;
  end if;
  insert into public.menu_items (menu_id, label, link, sort_order) values
    (header, 'Home', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000001"}'::jsonb, 0),
    (header, 'About', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000002"}'::jsonb, 1),
    (header, 'Services', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000003"}'::jsonb, 2),
    (header, 'Our Impact', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000004"}'::jsonb, 3),
    (header, 'Insights', '{"kind": "module", "moduleKey": "blog", "path": "/blog"}'::jsonb, 4),
    (explore, 'Home', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000001"}'::jsonb, 0),
    (explore, 'About', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000002"}'::jsonb, 1),
    (explore, 'Services', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000003"}'::jsonb, 2),
    (explore, 'Our Impact', '{"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000004"}'::jsonb, 3),
    (explore, 'Insights', '{"kind": "module", "moduleKey": "blog", "path": "/blog"}'::jsonb, 4),
    (services, 'Growth Strategy', '{"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "growth-strategy"}'::jsonb, 0),
    (services, 'Financial Guidance', '{"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "financial-guidance"}'::jsonb, 1),
    (services, 'Marketing & Brand', '{"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "marketing-brand"}'::jsonb, 2),
    (services, 'People & Culture', '{"kind": "anchor", "pageId": "a0000000-0000-4000-8000-000000000003", "anchorId": "people-culture"}'::jsonb, 3);
end;
$menus$;
