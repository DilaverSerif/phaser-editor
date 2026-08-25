import type { HTMLAttributes, Ref } from "react";

type WebviewProps = HTMLAttributes<HTMLElement> & {
  src?: string;
  partition?: string;
  preload?: string;
  webpreferences?: string;
  allowpopups?: boolean | string;
  ref?: Ref<HTMLElement>;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      webview: WebviewProps;
    }
  }
}

export {};
