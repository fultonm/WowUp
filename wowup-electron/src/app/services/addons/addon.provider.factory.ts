import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AddonProvider } from "../../addon-providers/addon-provider";
import { CurseAddonProvider } from "../../addon-providers/curse-addon-provider";
import { GitHubAddonProvider } from "../../addon-providers/github-addon-provider";
import { TukUiAddonProvider } from "../../addon-providers/tukui-addon-provider";
import { WowInterfaceAddonProvider } from "../../addon-providers/wow-interface-addon-provider";
import { WowUpAddonProvider } from "../../addon-providers/wowup-addon-provider";
import { RaiderIoAddonProvider } from "../../addon-providers/raiderio-provider";
import { ZipAddonProvider } from "../../addon-providers/zip-provider";
import { WowUpCompanionAddonProvider } from "../../addon-providers/wowup-companion-addon-provider";
import { CachingService } from "../caching/caching-service";
import { ElectronService } from "../electron/electron.service";
import { WowUpService } from "../wowup/wowup.service";
import { NetworkService } from "../network/network.service";
import { FileService } from "../files/file.service";
import { TocService } from "../toc/toc.service";
import { WarcraftService } from "../warcraft/warcraft.service";
import { WowUpApiService } from "../wowup-api/wowup-api.service";
import { AddonProviderState } from "../../models/wowup/addon-provider-state";
import { ADDON_PROVIDER_UNKNOWN } from "../../../common/constants";

@Injectable({
  providedIn: "root",
})
export class AddonProviderFactory {
  private _providerMap: Map<string, AddonProvider> = new Map();

  public constructor(
    private _cachingService: CachingService,
    private _electronService: ElectronService,
    private _httpClient: HttpClient,
    private _wowupService: WowUpService,
    private _networkService: NetworkService,
    private _fileService: FileService,
    private _tocService: TocService,
    private _warcraftService: WarcraftService,
    private _wowupApiService: WowUpApiService
  ) {
    this.loadProviders();
  }

  public createWowUpCompanionAddonProvider(): WowUpCompanionAddonProvider {
    return new WowUpCompanionAddonProvider(this._fileService, this._tocService);
  }

  public createRaiderIoAddonProvider(): RaiderIoAddonProvider {
    return new RaiderIoAddonProvider(this._tocService);
  }

  public createCurseAddonProvider(): CurseAddonProvider {
    return new CurseAddonProvider(
      this._cachingService,
      this._electronService,
      this._wowupApiService,
      this._tocService,
      this._networkService
    );
  }

  public createTukUiAddonProvider(): TukUiAddonProvider {
    return new TukUiAddonProvider(this._cachingService, this._networkService, this._tocService);
  }

  public createWowInterfaceAddonProvider(): WowInterfaceAddonProvider {
    return new WowInterfaceAddonProvider(this._cachingService, this._networkService, this._tocService);
  }

  public createGitHubAddonProvider(): GitHubAddonProvider {
    return new GitHubAddonProvider(this._httpClient, this._warcraftService);
  }

  public createWowUpAddonProvider(): WowUpAddonProvider {
    return new WowUpAddonProvider(this._electronService, this._cachingService, this._networkService);
  }

  public createZipAddonProvider(): ZipAddonProvider {
    return new ZipAddonProvider(this._httpClient, this._fileService, this._tocService, this._warcraftService);
  }

  public getProvider<T = AddonProvider>(providerName: string): T | undefined {
    if (!providerName || !this.hasProvider(providerName)) {
      return undefined;
    }

    return this._providerMap.get(providerName) as any;
  }

  public hasProvider(providerName: string): boolean {
    return this._providerMap.has(providerName);
  }

  public getAddonProviderForUri(addonUri: URL): AddonProvider | undefined {
    for (const ap of this._providerMap.values()) {
      if (ap.isValidAddonUri(addonUri)) {
        return ap;
      }
    }

    return undefined;
  }

  public getEnabledAddonProviders(): AddonProvider[] {
    const providers: AddonProvider[] = [];

    this._providerMap.forEach((ap) => {
      if (ap.enabled) {
        providers.push(ap);
      }
    });

    return providers;
  }

  public getBatchAddonProviders(): AddonProvider[] {
    const providers: AddonProvider[] = [];

    this._providerMap.forEach((ap) => {
      if (ap.enabled && ap.canBatchFetch) {
        providers.push(ap);
      }
    });

    return providers;
  }

  public getStandardAddonProviders(): AddonProvider[] {
    const providers: AddonProvider[] = [];

    this._providerMap.forEach((ap) => {
      if (ap.enabled && !ap.canBatchFetch) {
        providers.push(ap);
      }
    });

    return providers;
  }

  public getAddonProviderStates(): AddonProviderState[] {
    const states: AddonProviderState[] = [];

    this._providerMap.forEach((ap) => {
      states.push({
        providerName: ap.name,
        enabled: ap.enabled,
        canEdit: ap.allowEdit,
      });
    });

    return states;
  }

  public canShowChangelog(providerName: string | undefined): boolean {
    return this.getProvider(providerName)?.canShowChangelog ?? false;
  }

  public isForceIgnore(providerName: string): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }

    return providerName === ADDON_PROVIDER_UNKNOWN || (provider?.forceIgnore ?? false);
  }

  public canReinstall(providerName: string): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }

    return providerName !== ADDON_PROVIDER_UNKNOWN && (provider?.allowReinstall ?? false);
  }

  public canChangeChannel(providerName: string): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }

    return providerName !== ADDON_PROVIDER_UNKNOWN && (provider?.allowChannelChange ?? false);
  }

  private loadProviders() {
    if (this._providerMap.size === 0) {
      const providers = [
        this.createZipAddonProvider(),
        this.createRaiderIoAddonProvider(),
        this.createWowUpCompanionAddonProvider(),
        this.createWowUpAddonProvider(),
        this.createCurseAddonProvider(),
        this.createTukUiAddonProvider(),
        this.createWowInterfaceAddonProvider(),
        this.createGitHubAddonProvider(),
      ];

      providers.forEach((provider) => {
        this.setProviderState(provider);
        this._providerMap.set(provider.name, provider);
      });
    }
  }

  private setProviderState = (provider: AddonProvider) => {
    const state = this._wowupService.getAddonProviderState(provider.name);
    if (state) {
      provider.enabled = state.enabled;
    }
  };
}
