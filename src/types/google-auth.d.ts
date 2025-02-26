declare global {
    interface Window {
      gapi: {
        load(api: string, callback: () => void): void;
        auth2: {
          init(params: { client_id: string; scope: string }): Promise<void>;
          getAuthInstance(): any;
        };
      };
    }
  }
  
  export {};  // This is important to make the file a module
  