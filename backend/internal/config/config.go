package config

// 基础 tracker 列表
var BaseTrackers = []string{
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://tracker.tiny-vps.com:6969/announce",
}

// 环境变量常量
const (
    DefaultAdapterEnv  = "DEFAULT_ADAPTER"
    FallbackAdapterEnv = "FALLBACK_ADAPTER"
    PortEnv            = "PORT"
    ApibayEndpointEnv  = "MAGNET_SEARCH_ENDPOINT"
    NyaaEndpointEnv    = "NYAA_ENDPOINT"
    SampleDataEnv      = "SAMPLE_DATA_FILE"
)

