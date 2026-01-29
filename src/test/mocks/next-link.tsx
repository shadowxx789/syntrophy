import * as React from "react";

type Href = string | { pathname?: string };

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  children?: React.ReactNode;
};

export default function Link({ href, children, ...props }: LinkProps) {
  const resolvedHref = typeof href === "string" ? href : href.pathname || "";
  return (
    <a href={resolvedHref} {...props}>
      {children}
    </a>
  );
}
