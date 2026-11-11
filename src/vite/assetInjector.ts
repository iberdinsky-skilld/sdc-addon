// Browser module that injects external CSS/JS before a component's stories.
export const VIRTUAL_ASSET_INJECTOR = 'virtual:sdc-asset-injector'
export const VIRTUAL_ASSET_INJECTOR_ID = '\0' + VIRTUAL_ASSET_INJECTOR

export const assetInjectorModule = `
function applyAttrs(el, attrs) {
  if (!attrs) return
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue
    el.setAttribute(k, v === true ? '' : String(v))
  }
}
export async function injectAssets(assets) {
  if (typeof document === 'undefined') return
  await Promise.all(assets.map((asset) => {
    const sel = asset.type === 'js' ? \`script[src="\${asset.url}"]\` : \`link[href="\${asset.url}"]\`
    if (document.querySelector(sel)) return Promise.resolve()
    return new Promise((res, rej) => {
      if (asset.type === 'js') {
        const s = document.createElement('script')
        applyAttrs(s, asset.attributes)
        // async off: scripts run in list order (jquery before jquery-ui).
        s.async = false
        s.src = asset.url; s.onload = res; s.onerror = rej; document.head.appendChild(s)
      } else {
        const l = document.createElement('link'); l.rel = 'stylesheet'
        applyAttrs(l, asset.attributes)
        l.href = asset.url
        if (asset.media) l.media = asset.media; l.onload = res; document.head.appendChild(l)
      }
    })
  }))
}
`
