// src/background/background.ts
import { Sanitization } from '../types/types'; // Keep this import

// Import new Brazilian PII rules
import { cpfRule } from '../config/pii_rules/cpf';
import { rgRule } from '../config/pii_rules/rg';
import { cnhRule } from '../config/pii_rules/cnh';
import { cepRule } from '../config/pii_rules/cep';

// Import adapted existing rules (pt-BR versions)
import { fullName_ptBR_Rule } from '../config/pii_rules/fullName_ptBR';
import { email_ptBR_Rule } from '../config/pii_rules/email_ptBR';
import { ssn_USA_ptBR_Rule } from '../config/pii_rules/ssn_USA_ptBR';
import { creditCard_ptBR_Rule } from '../config/pii_rules/creditCard_ptBR';
import { apiToken_ptBR_Rule } from '../config/pii_rules/apiToken_ptBR';
import { awsKey_ptBR_Rule } from '../config/pii_rules/awsKey_ptBR';
import { phone_ptBR_Rule } from '../config/pii_rules/phone_ptBR';
import { websiteURL_ptBR_Rule } from '../config/pii_rules/websiteURL_ptBR';
import { macAddress_ptBR_Rule } from '../config/pii_rules/macAddress_ptBR';
import { ipv4Address_ptBR_Rule } from '../config/pii_rules/ipv4Address_ptBR';
import { ipv6Address_ptBR_Rule } from '../config/pii_rules/ipv6Address_ptBR';
import { date_ptBR_Rule } from '../config/pii_rules/date_ptBR';
import { vin_ptBR_Rule } from '../config/pii_rules/vin_ptBR';

chrome.runtime.onInstalled.addListener(() => {
  const defaultSanitizations: Sanitization[] = [
    // New Brazilian PII Rules
    cpfRule,
    rgRule,
    cnhRule,
    cepRule,

    // Adapted Existing Rules (pt-BR)
    // Ordered by their original IDs for some consistency
    fullName_ptBR_Rule,    // Original ID 1
    email_ptBR_Rule,       // Original ID 2
    ssn_USA_ptBR_Rule,     // Original ID 3 (US SSN, disabled by default)
    creditCard_ptBR_Rule,  // Original ID 4
    apiToken_ptBR_Rule,    // Original ID 5
    awsKey_ptBR_Rule,      // Original ID 6
    phone_ptBR_Rule,       // Original ID 7
    websiteURL_ptBR_Rule,  // Original ID 8
    macAddress_ptBR_Rule,  // Original ID 9
    ipv4Address_ptBR_Rule, // Original ID 10
    ipv6Address_ptBR_Rule, // Original ID 11
    date_ptBR_Rule,        // Original ID 12
    vin_ptBR_Rule,         // Original ID 13
  ];

  const defaultWebsites = [
    { url: 'chat.openai.com', enabled: true },
    { url: 'chatgpt.com', enabled: true },
    { url: 'claude.ai', enabled: true },
    { url: 'bard.google.com', enabled: true }
  ];

  // Preserve existing darkMode setting if it exists
  chrome.storage.local.get(['darkMode'], (result) => {
    chrome.storage.local.set({
      sanitizations: defaultSanitizations,
      websites: defaultWebsites,
      isGloballyPaused: false,
      darkMode: result.darkMode !== undefined ? result.darkMode : true
    });
  });
});