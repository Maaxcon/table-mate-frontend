export {
  buildClientParams,
  createClient,
  createConfig,
  formDataBodySerializer,
  jsonBodySerializer,
  urlSearchParamsBodySerializer,
} from "@hey-api/client-fetch"
import type { Options as FetchOptions, ResponseStyle, TDataShape } from "@hey-api/client-fetch"

type GeneratedResponseStyle<TResponse> =
  Extract<TResponse, ResponseStyle> extends never ? "fields" : Extract<TResponse, ResponseStyle>

export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
  TResponse = unknown,
> = FetchOptions<TData, ThrowOnError, GeneratedResponseStyle<TResponse>>

export type {
  Auth,
  Client,
  ClientOptions,
  Config,
  CreateClientConfig,
  OptionsLegacyParser,
  QuerySerializerOptions,
  RequestOptions,
  RequestResult,
} from "@hey-api/client-fetch"
export type { ResponseStyle, TDataShape }
