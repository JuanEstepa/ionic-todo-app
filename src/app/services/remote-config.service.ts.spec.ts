import { TestBed } from '@angular/core/testing';

import { RemoteConfigServiceTs } from './remote-config.service.ts';

describe('RemoteConfigServiceTs', () => {
  let service: RemoteConfigServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RemoteConfigServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
