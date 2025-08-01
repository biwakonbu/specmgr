namespace OracleCli.Commands

open OracleCli.Core

/// All supported Oracle CLI commands
type OracleCommand =
    | FindSpec of Query
    | CheckImpl of CodePath * SpecificationPath
    | GenerateSpec of CodePath
    | ShowSpec of SpecificationPath
    | ListSpecs of tag: string option
    | Watch of CodePath
    | Ask of Query
    | DocsSign of SpecificationPath * SignerInfo option * string option
    | Help

/// Command execution context
type CommandContext = {
    Config: ServiceConfig
    Verbose: bool
    DryRun: bool
}