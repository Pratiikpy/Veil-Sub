"use strict";
// =============================================================================
// @veilsub/sdk — Main Entry Point
//
// Privacy-first creator subscriptions on Aleo.
// Wraps all 31 VeilSub v28 contract transitions into a clean TypeScript API.
//
// Usage:
//   import { VeilSubClient } from '@veilsub/sdk';
//   const client = new VeilSubClient();
//
// Or import individual builders:
//   import { buildSubscribe, buildTip } from '@veilsub/sdk';
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPublishEncryptedContent = exports.buildPublishContent = exports.buildTransferPass = exports.buildRedeemGift = exports.buildGiftSubscription = exports.buildRenewBlind = exports.buildRenew = exports.buildSubscribeUsad = exports.buildSubscribeUsdcx = exports.buildSubscribeTrial = exports.buildSubscribeBlind = exports.buildSubscribe = exports.buildWithdrawPlatformFees = exports.buildWithdrawCreatorRev = exports.buildDeprecateTier = exports.buildUpdateTierPrice = exports.buildCreateCustomTier = exports.buildRegisterCreator = exports.TRANSITIONS = exports.SCOPE_ALL = exports.SCOPE_SUBSCRIBER = exports.SCOPE_EXPIRY = exports.SCOPE_TIER = exports.SCOPE_CREATOR = exports.ALEO_ADDRESS_REGEX = exports.TOKEN_META = exports.TOKEN_USAD = exports.TOKEN_USDCX = exports.TOKEN_CREDITS = exports.FEES = exports.SECONDS_PER_BLOCK = exports.MICROCREDITS_PER_CREDIT = exports.SUBSCRIPTION_DURATION_BLOCKS = exports.TRIAL_PRICE_DIVISOR = exports.TRIAL_DURATION_BLOCKS = exports.MAX_SUBS_PER_CREATOR = exports.MAX_CONTENT_PER_CREATOR = exports.MIN_PRICE = exports.MAX_TIER = exports.MAX_EXPIRY_BLOCKS = exports.PLATFORM_FEE_DIVISOR = exports.USAD_PROGRAM_ID = exports.USDCX_PROGRAM_ID = exports.PLATFORM_ADDRESS = exports.MAINNET_API_URL = exports.TESTNET_API_URL = exports.DEFAULT_PROGRAM_ID = exports.MAPPING_NAMES = exports.VeilSubError = exports.VeilSubClient = void 0;
exports.getErrorDescription = exports.parseErrorCode = exports.calculateExpiry = exports.blocksToSeconds = exports.secondsToBlocks = exports.formatCredits = exports.creditsToMicro = exports.microToCredits = exports.assertValidAddress = exports.isValidAleoAddress = exports.generateFieldId = exports.toField = exports.toU64 = exports.toU32 = exports.toU8 = exports.parseLeoBool = exports.parseLeoField = exports.parseLeoU64 = exports.stripLeoSuffix = exports.buildProveThreshold = exports.buildCreateAuditToken = exports.buildVerifyTierAccess = exports.buildVerifyAccess = exports.buildTipUsad = exports.buildTipUsdcx = exports.buildRevealTip = exports.buildCommitTip = exports.buildTip = exports.buildRevokeAccess = exports.buildDisputeContent = exports.buildDeleteContent = exports.buildUpdateContent = void 0;
// Main client
var client_1 = require("./client");
Object.defineProperty(exports, "VeilSubClient", { enumerable: true, get: function () { return client_1.VeilSubClient; } });
// Error class (value export)
var types_1 = require("./types");
Object.defineProperty(exports, "VeilSubError", { enumerable: true, get: function () { return types_1.VeilSubError; } });
Object.defineProperty(exports, "MAPPING_NAMES", { enumerable: true, get: function () { return types_1.MAPPING_NAMES; } });
// Constants
var constants_1 = require("./constants");
Object.defineProperty(exports, "DEFAULT_PROGRAM_ID", { enumerable: true, get: function () { return constants_1.DEFAULT_PROGRAM_ID; } });
Object.defineProperty(exports, "TESTNET_API_URL", { enumerable: true, get: function () { return constants_1.TESTNET_API_URL; } });
Object.defineProperty(exports, "MAINNET_API_URL", { enumerable: true, get: function () { return constants_1.MAINNET_API_URL; } });
Object.defineProperty(exports, "PLATFORM_ADDRESS", { enumerable: true, get: function () { return constants_1.PLATFORM_ADDRESS; } });
Object.defineProperty(exports, "USDCX_PROGRAM_ID", { enumerable: true, get: function () { return constants_1.USDCX_PROGRAM_ID; } });
Object.defineProperty(exports, "USAD_PROGRAM_ID", { enumerable: true, get: function () { return constants_1.USAD_PROGRAM_ID; } });
Object.defineProperty(exports, "PLATFORM_FEE_DIVISOR", { enumerable: true, get: function () { return constants_1.PLATFORM_FEE_DIVISOR; } });
Object.defineProperty(exports, "MAX_EXPIRY_BLOCKS", { enumerable: true, get: function () { return constants_1.MAX_EXPIRY_BLOCKS; } });
Object.defineProperty(exports, "MAX_TIER", { enumerable: true, get: function () { return constants_1.MAX_TIER; } });
Object.defineProperty(exports, "MIN_PRICE", { enumerable: true, get: function () { return constants_1.MIN_PRICE; } });
Object.defineProperty(exports, "MAX_CONTENT_PER_CREATOR", { enumerable: true, get: function () { return constants_1.MAX_CONTENT_PER_CREATOR; } });
Object.defineProperty(exports, "MAX_SUBS_PER_CREATOR", { enumerable: true, get: function () { return constants_1.MAX_SUBS_PER_CREATOR; } });
Object.defineProperty(exports, "TRIAL_DURATION_BLOCKS", { enumerable: true, get: function () { return constants_1.TRIAL_DURATION_BLOCKS; } });
Object.defineProperty(exports, "TRIAL_PRICE_DIVISOR", { enumerable: true, get: function () { return constants_1.TRIAL_PRICE_DIVISOR; } });
Object.defineProperty(exports, "SUBSCRIPTION_DURATION_BLOCKS", { enumerable: true, get: function () { return constants_1.SUBSCRIPTION_DURATION_BLOCKS; } });
Object.defineProperty(exports, "MICROCREDITS_PER_CREDIT", { enumerable: true, get: function () { return constants_1.MICROCREDITS_PER_CREDIT; } });
Object.defineProperty(exports, "SECONDS_PER_BLOCK", { enumerable: true, get: function () { return constants_1.SECONDS_PER_BLOCK; } });
Object.defineProperty(exports, "FEES", { enumerable: true, get: function () { return constants_1.FEES; } });
Object.defineProperty(exports, "TOKEN_CREDITS", { enumerable: true, get: function () { return constants_1.TOKEN_CREDITS; } });
Object.defineProperty(exports, "TOKEN_USDCX", { enumerable: true, get: function () { return constants_1.TOKEN_USDCX; } });
Object.defineProperty(exports, "TOKEN_USAD", { enumerable: true, get: function () { return constants_1.TOKEN_USAD; } });
Object.defineProperty(exports, "TOKEN_META", { enumerable: true, get: function () { return constants_1.TOKEN_META; } });
Object.defineProperty(exports, "ALEO_ADDRESS_REGEX", { enumerable: true, get: function () { return constants_1.ALEO_ADDRESS_REGEX; } });
Object.defineProperty(exports, "SCOPE_CREATOR", { enumerable: true, get: function () { return constants_1.SCOPE_CREATOR; } });
Object.defineProperty(exports, "SCOPE_TIER", { enumerable: true, get: function () { return constants_1.SCOPE_TIER; } });
Object.defineProperty(exports, "SCOPE_EXPIRY", { enumerable: true, get: function () { return constants_1.SCOPE_EXPIRY; } });
Object.defineProperty(exports, "SCOPE_SUBSCRIBER", { enumerable: true, get: function () { return constants_1.SCOPE_SUBSCRIBER; } });
Object.defineProperty(exports, "SCOPE_ALL", { enumerable: true, get: function () { return constants_1.SCOPE_ALL; } });
Object.defineProperty(exports, "TRANSITIONS", { enumerable: true, get: function () { return constants_1.TRANSITIONS; } });
// Transaction builders (standalone — no client needed)
var creator_1 = require("./creator");
Object.defineProperty(exports, "buildRegisterCreator", { enumerable: true, get: function () { return creator_1.buildRegisterCreator; } });
Object.defineProperty(exports, "buildCreateCustomTier", { enumerable: true, get: function () { return creator_1.buildCreateCustomTier; } });
Object.defineProperty(exports, "buildUpdateTierPrice", { enumerable: true, get: function () { return creator_1.buildUpdateTierPrice; } });
Object.defineProperty(exports, "buildDeprecateTier", { enumerable: true, get: function () { return creator_1.buildDeprecateTier; } });
Object.defineProperty(exports, "buildWithdrawCreatorRev", { enumerable: true, get: function () { return creator_1.buildWithdrawCreatorRev; } });
Object.defineProperty(exports, "buildWithdrawPlatformFees", { enumerable: true, get: function () { return creator_1.buildWithdrawPlatformFees; } });
var subscribe_1 = require("./subscribe");
Object.defineProperty(exports, "buildSubscribe", { enumerable: true, get: function () { return subscribe_1.buildSubscribe; } });
Object.defineProperty(exports, "buildSubscribeBlind", { enumerable: true, get: function () { return subscribe_1.buildSubscribeBlind; } });
Object.defineProperty(exports, "buildSubscribeTrial", { enumerable: true, get: function () { return subscribe_1.buildSubscribeTrial; } });
Object.defineProperty(exports, "buildSubscribeUsdcx", { enumerable: true, get: function () { return subscribe_1.buildSubscribeUsdcx; } });
Object.defineProperty(exports, "buildSubscribeUsad", { enumerable: true, get: function () { return subscribe_1.buildSubscribeUsad; } });
Object.defineProperty(exports, "buildRenew", { enumerable: true, get: function () { return subscribe_1.buildRenew; } });
Object.defineProperty(exports, "buildRenewBlind", { enumerable: true, get: function () { return subscribe_1.buildRenewBlind; } });
Object.defineProperty(exports, "buildGiftSubscription", { enumerable: true, get: function () { return subscribe_1.buildGiftSubscription; } });
Object.defineProperty(exports, "buildRedeemGift", { enumerable: true, get: function () { return subscribe_1.buildRedeemGift; } });
Object.defineProperty(exports, "buildTransferPass", { enumerable: true, get: function () { return subscribe_1.buildTransferPass; } });
var content_1 = require("./content");
Object.defineProperty(exports, "buildPublishContent", { enumerable: true, get: function () { return content_1.buildPublishContent; } });
Object.defineProperty(exports, "buildPublishEncryptedContent", { enumerable: true, get: function () { return content_1.buildPublishEncryptedContent; } });
Object.defineProperty(exports, "buildUpdateContent", { enumerable: true, get: function () { return content_1.buildUpdateContent; } });
Object.defineProperty(exports, "buildDeleteContent", { enumerable: true, get: function () { return content_1.buildDeleteContent; } });
Object.defineProperty(exports, "buildDisputeContent", { enumerable: true, get: function () { return content_1.buildDisputeContent; } });
Object.defineProperty(exports, "buildRevokeAccess", { enumerable: true, get: function () { return content_1.buildRevokeAccess; } });
var tipping_1 = require("./tipping");
Object.defineProperty(exports, "buildTip", { enumerable: true, get: function () { return tipping_1.buildTip; } });
Object.defineProperty(exports, "buildCommitTip", { enumerable: true, get: function () { return tipping_1.buildCommitTip; } });
Object.defineProperty(exports, "buildRevealTip", { enumerable: true, get: function () { return tipping_1.buildRevealTip; } });
Object.defineProperty(exports, "buildTipUsdcx", { enumerable: true, get: function () { return tipping_1.buildTipUsdcx; } });
Object.defineProperty(exports, "buildTipUsad", { enumerable: true, get: function () { return tipping_1.buildTipUsad; } });
var verify_1 = require("./verify");
Object.defineProperty(exports, "buildVerifyAccess", { enumerable: true, get: function () { return verify_1.buildVerifyAccess; } });
Object.defineProperty(exports, "buildVerifyTierAccess", { enumerable: true, get: function () { return verify_1.buildVerifyTierAccess; } });
Object.defineProperty(exports, "buildCreateAuditToken", { enumerable: true, get: function () { return verify_1.buildCreateAuditToken; } });
Object.defineProperty(exports, "buildProveThreshold", { enumerable: true, get: function () { return verify_1.buildProveThreshold; } });
// Utility functions
var utils_1 = require("./utils");
Object.defineProperty(exports, "stripLeoSuffix", { enumerable: true, get: function () { return utils_1.stripLeoSuffix; } });
Object.defineProperty(exports, "parseLeoU64", { enumerable: true, get: function () { return utils_1.parseLeoU64; } });
Object.defineProperty(exports, "parseLeoField", { enumerable: true, get: function () { return utils_1.parseLeoField; } });
Object.defineProperty(exports, "parseLeoBool", { enumerable: true, get: function () { return utils_1.parseLeoBool; } });
Object.defineProperty(exports, "toU8", { enumerable: true, get: function () { return utils_1.toU8; } });
Object.defineProperty(exports, "toU32", { enumerable: true, get: function () { return utils_1.toU32; } });
Object.defineProperty(exports, "toU64", { enumerable: true, get: function () { return utils_1.toU64; } });
Object.defineProperty(exports, "toField", { enumerable: true, get: function () { return utils_1.toField; } });
Object.defineProperty(exports, "generateFieldId", { enumerable: true, get: function () { return utils_1.generateFieldId; } });
Object.defineProperty(exports, "isValidAleoAddress", { enumerable: true, get: function () { return utils_1.isValidAleoAddress; } });
Object.defineProperty(exports, "assertValidAddress", { enumerable: true, get: function () { return utils_1.assertValidAddress; } });
Object.defineProperty(exports, "microToCredits", { enumerable: true, get: function () { return utils_1.microToCredits; } });
Object.defineProperty(exports, "creditsToMicro", { enumerable: true, get: function () { return utils_1.creditsToMicro; } });
Object.defineProperty(exports, "formatCredits", { enumerable: true, get: function () { return utils_1.formatCredits; } });
Object.defineProperty(exports, "secondsToBlocks", { enumerable: true, get: function () { return utils_1.secondsToBlocks; } });
Object.defineProperty(exports, "blocksToSeconds", { enumerable: true, get: function () { return utils_1.blocksToSeconds; } });
Object.defineProperty(exports, "calculateExpiry", { enumerable: true, get: function () { return utils_1.calculateExpiry; } });
Object.defineProperty(exports, "parseErrorCode", { enumerable: true, get: function () { return utils_1.parseErrorCode; } });
Object.defineProperty(exports, "getErrorDescription", { enumerable: true, get: function () { return utils_1.getErrorDescription; } });
//# sourceMappingURL=index.js.map