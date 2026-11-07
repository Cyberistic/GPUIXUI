/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import type { ReactNode } from "react";

export interface ShaderProps extends Omit<Props, "children"> {
  readonly source: string;
  readonly time?: number;
  readonly params?: ReadonlyArray<number>;
  readonly readsBackdrop?: boolean;
  readonly simulationSource?: string;
  readonly simulationGrid?: readonly [number, number];
  readonly simulationUniform?: ReadonlyArray<number>;
  readonly children?: ReactNode;
}

declare module "@gpuix/react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "gpuixui-shader": ShaderProps;
    }
  }
}

export const Shader = (props: ShaderProps): ReactNode => (
  <gpuixui-shader {...props} />
);
