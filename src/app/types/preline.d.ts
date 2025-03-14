declare module 'preline' {
  export interface IStaticMethods {
    autoInit(): void;
    on(type: string, callback: () => void): void;
    getClassProperty(element: HTMLElement, className: string, property: string): string;
  }

  declare global {
    interface Window {
      HSStaticMethods: IStaticMethods;
    }
  }

  export const HSStaticMethods: IStaticMethods;
}