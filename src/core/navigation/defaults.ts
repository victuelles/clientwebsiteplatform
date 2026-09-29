// TODO(phase-4): replace with editable menus (header, footer columns) stored in the database.

export type NavLink = { label: string; href: string };
export type FooterColumn = { title: string; links: NavLink[] };

export const DEFAULT_HEADER_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Our Impact", href: "/our-impact" },
  { label: "Insights", href: "/insights" },
];

export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  { title: "Explore", links: DEFAULT_HEADER_LINKS },
  {
    title: "What we do",
    links: [
      { label: "Growth Strategy", href: "/services#growth-strategy" },
      { label: "Financial Guidance", href: "/services#financial-guidance" },
      { label: "Marketing & Brand", href: "/services#marketing-brand" },
      { label: "People & Culture", href: "/services#people-culture" },
    ],
  },
];
