import {
  IItemService,
  ISubmissionService,
  IPostService,
  IAuthService,
  IUploadService,
} from './contracts';
import { InMemoryItemService } from './in-memory/InMemoryItemService';
import { InMemorySubmissionService } from './in-memory/InMemorySubmissionService';
import { InMemoryPostService } from './in-memory/InMemoryPostService';
import { InMemoryAuthService } from './in-memory/InMemoryAuthService';
import { InMemoryUploadService } from './in-memory/InMemoryUploadService';
import { HttpItemService } from './http/HttpItemService';
import { HttpUploadService } from './http/HttpUploadService';
import { HttpPostService } from './http/HttpPostService';
import { HttpAuthService } from './http/HttpAuthService';

export type ServiceMode = 'in-memory' | 'http';

export interface ServiceContainer {
  items: IItemService;
  submissions: ISubmissionService;
  posts: IPostService;
  auth: IAuthService;
  upload: IUploadService;
  mode: ServiceMode;
}

class ServiceRegistry {
  private currentMode: ServiceMode;
  private inMemoryContainer: ServiceContainer;
  private httpContainer: ServiceContainer;

  constructor() {
    this.inMemoryContainer = {
      items: new InMemoryItemService(),
      submissions: new InMemorySubmissionService(),
      posts: new InMemoryPostService(),
      auth: new InMemoryAuthService(),
      upload: new InMemoryUploadService(),
      mode: 'in-memory',
    };

    this.httpContainer = {
      items: new HttpItemService(),
      submissions: new InMemorySubmissionService(),
      posts: new HttpPostService(),
      auth: new HttpAuthService(),
      upload: new HttpUploadService(),
      mode: 'http',
    };

    const isMock = import.meta.env.VITE_USE_MOCK !== 'false';
    this.currentMode = isMock ? 'in-memory' : 'http';
  }

  public getServices(): ServiceContainer {
    return this.currentMode === 'http' ? this.httpContainer : this.inMemoryContainer;
  }

  public setMode(mode: ServiceMode): void {
    this.currentMode = mode;
  }

  public getMode(): ServiceMode {
    return this.currentMode;
  }
}

export const registry = new ServiceRegistry();

export const services: ServiceContainer = new Proxy({} as ServiceContainer, {
  get: (_target, prop: keyof ServiceContainer) => {
    return registry.getServices()[prop];
  },
});
