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
  private currentMode: ServiceMode = 'in-memory';
  private inMemoryContainer: ServiceContainer;

  constructor() {
    this.inMemoryContainer = {
      items: new InMemoryItemService(),
      submissions: new InMemorySubmissionService(),
      posts: new InMemoryPostService(),
      auth: new InMemoryAuthService(),
      upload: new InMemoryUploadService(),
      mode: 'in-memory',
    };
  }

  public getServices(): ServiceContainer {
    if (this.currentMode === 'in-memory') {
      return this.inMemoryContainer;
    }

    // In HTTP mode: explicitly throw if real HTTP adapters are not configured yet,
    // avoiding silent fallback to fake mock data (rule F/A.3.2)
    throw new Error(
      'HTTP Adapter belum aktif. Gunakan in-memory mode untuk demonstrasi Frontend MVP.'
    );
  }

  public setMode(mode: ServiceMode): void {
    this.currentMode = mode;
  }

  public getMode(): ServiceMode {
    return this.currentMode;
  }
}

export const registry = new ServiceRegistry();
export const services = registry.getServices();
