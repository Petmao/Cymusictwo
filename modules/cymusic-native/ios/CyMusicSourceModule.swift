import ExpoModulesCore

/// 承载 LX / CyMusic JS 音源的 JavaScriptCore 运行时。
/// preload 脚本通过 pod 资源打进包内，避免依赖主工程 pbxproj。
public final class CyMusicSourceModule: Module {
  private var runtimeStorage: CyMusicUserApiRuntime?

  private static func preloadURL() -> URL? {
    let podBundle = Bundle(for: CyMusicUserApiRuntime.self)
    if let url = podBundle.url(forResource: "user-api-preload", withExtension: "js") {
      return url
    }
    return Bundle.main.url(forResource: "user-api-preload", withExtension: "js")
  }

  private func runtime() -> CyMusicUserApiRuntime {
    if let runtime = runtimeStorage {
      return runtime
    }
    let created = CyMusicUserApiRuntime(preload: Self.preloadURL()) { [weak self] event in
      self?.sendEvent("api-action", event)
    }
    runtimeStorage = created
    return created
  }

  public func definition() -> ModuleDefinition {
    Name("UserApiModule")

    Events("api-action")

    OnStartObserving {
      self.runtime().startObserving()
    }

    OnStopObserving {
      self.runtime().stopObserving()
    }

    OnDestroy {
      self.runtimeStorage?.invalidate()
      self.runtimeStorage = nil
    }

    Function("loadScript") { (data: [String: String]) -> String in
      self.runtime().loadScript(data)
    }

    Function("sendAction") { (action: String, info: String, generation: String) in
      self.runtime().sendAction(action, info: info, generation: generation)
    }

    Function("destroy") { () -> String in
      self.runtime().destroy()
    }
  }
}
