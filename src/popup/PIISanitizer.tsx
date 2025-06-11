import React, { useState, useEffect } from 'react';
import { AlertCircle, Moon, Sun, Info, Plus, Play, Pause, Edit2, Save, X, RefreshCw, Globe, Trash2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';

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

// Types
// Note: Sanitization type is also imported by the rule files.
// If this local definition differs, it might cause issues.
// For now, assuming they are compatible as per current structure.
interface Sanitization {
  id: string;
  description: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
  isEditing?: boolean;
  isRegex: boolean;
}

interface Website {
  url: string;
  enabled: boolean;
}

const DEFAULT_WEBSITES = [
  { url: 'chat.openai.com', enabled: true },
  { url: 'chatgpt.com', enabled: true },
  { url: 'claude.ai', enabled: true },
  { url: 'bard.google.com', enabled: true }
];

const DEFAULT_SANITIZATIONS: Sanitization[] = [
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

const PIISanitizer = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isGloballyPaused, setIsGloballyPaused] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showWebsitesModal, setShowWebsitesModal] = useState(false);
  const [websites, setWebsites] = useState<Website[]>(DEFAULT_WEBSITES);
  const [newWebsite, setNewWebsite] = useState('');
  const [newSanitization, setNewSanitization] = useState({
    description: '',
    pattern: '',
    replacement: '',
    isRegex: false
  });
  const [sanitizations, setSanitizations] = useState<Sanitization[]>(DEFAULT_SANITIZATIONS);
  const [showDuplicateWebsiteError, setShowDuplicateWebsiteError] = useState('');
  const [showSanitizationError, setShowSanitizationError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [editedSanitization, setEditedSanitization] = useState<Sanitization | null>(null);

  // Load initial state from storage
  useEffect(() => {
    chrome.storage.local.get(['darkMode', 'isGloballyPaused', 'websites', 'sanitizations'], (result) => {
      if (result.darkMode !== undefined) setDarkMode(result.darkMode);
      if (result.isGloballyPaused !== undefined) setIsGloballyPaused(result.isGloballyPaused);
      if (result.websites) setWebsites(result.websites);
      if (result.sanitizations) setSanitizations(result.sanitizations);
    });

    // Get current URL
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url);
        setCurrentUrl(url.hostname);
        setNewWebsite(url.hostname);
      }
    });
  }, []);

  // Save state changes to storage
  const saveToStorage = (key: string, value: any) => {
    chrome.storage.local.set({ [key]: value });
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    saveToStorage('darkMode', newDarkMode);
  };

  const toggleGlobalPause = () => {
    const newPausedState = !isGloballyPaused;
    setIsGloballyPaused(newPausedState);
    saveToStorage('isGloballyPaused', newPausedState);
  };

  useEffect(() => {
    if (showDuplicateWebsiteError) {
      const timer = setTimeout(() => {
        setShowDuplicateWebsiteError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showDuplicateWebsiteError]);

  useEffect(() => {
    if (showSanitizationError) {
      const timer = setTimeout(() => {
        setShowSanitizationError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSanitizationError]);

  const validateUrl = (url: string) => {
    try {
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      const parsed = new URL(urlWithProtocol);
      
      const segments = parsed.hostname.split('.');
      if (segments.length < 2) return false;
      
      const validSegment = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
      return segments.every(segment => 
        segment.length > 0 && 
        segment.length <= 63 && 
        validSegment.test(segment)
      );
    } catch {
      return false;
    }
  };

  const addWebsite = () => {
    if (!newWebsite) {
      setShowDuplicateWebsiteError('Por favor, insira a URL de um site.');
      return;
    }

    if (!validateUrl(newWebsite)) {
      setShowDuplicateWebsiteError('Por favor, insira uma URL de site válida.');
      return;
    }

    const hostname = new URL(newWebsite.startsWith('http') ? newWebsite : `https://${newWebsite}`).hostname;
    
    if (websites.some(site => site.url === hostname)) {
      setShowDuplicateWebsiteError('Este site já está na lista.');
      return;
    }

    const newWebsites = [...websites, { url: hostname, enabled: true }];
    setWebsites(newWebsites);
    saveToStorage('websites', newWebsites);
    setNewWebsite('');
  };

  const addSanitization = () => {
    if (!newSanitization.description || !newSanitization.pattern || !newSanitization.replacement) {
      setShowSanitizationError('Por favor, preencha todos os campos.');
      return;
    }

    const duplicateDesc = sanitizations.find(s => 
      s.description.toLowerCase() === newSanitization.description.toLowerCase()
    );
    const duplicatePattern = sanitizations.find(s => 
      s.pattern === newSanitization.pattern
    );

    if (duplicateDesc) {
      setShowSanitizationError('Uma regra com esta descrição já existe.');
      return;
    }

    if (duplicatePattern) {
      setShowSanitizationError('Este padrão já existe.');
      return;
    }

    if (newSanitization.isRegex) {
      try {
        new RegExp(newSanitization.pattern);
      } catch (e) {
        setShowSanitizationError('Padrão de regex inválido.');
        return;
      }
    }

    const newRule = {
      id: Date.now().toString(),
      ...newSanitization,
      enabled: true
    };

    setSanitizations([...sanitizations, newRule]);
    saveToStorage('sanitizations', [...sanitizations, newRule]);

    setNewSanitization({
      description: '',
      pattern: '',
      replacement: '',
      isRegex: false
    });
  };

  const toggleSanitization = (id: string) => {
    const newSanitizations = sanitizations.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setSanitizations(newSanitizations);
    saveToStorage('sanitizations', newSanitizations);
  };

  const deleteSanitization = (id: string) => {
    const newSanitizations = sanitizations.filter(s => s.id !== id);
    setSanitizations(newSanitizations);
    saveToStorage('sanitizations', newSanitizations);
  };

  const editSanitization = (sanitization: Sanitization) => {
    setEditedSanitization({ ...sanitization });
    setSanitizations(sanitizations.map(s => 
      s.id === sanitization.id ? { ...s, isEditing: true } : s
    ));
  };

  const saveSanitization = (id: string) => {
    if (!editedSanitization) return;

    if (editedSanitization.isRegex) {
      try {
        new RegExp(editedSanitization.pattern);
      } catch (e) {
        setShowSanitizationError('Padrão de regex inválido.');
        return;
      }
    }
    
    const newSanitizations = sanitizations.map(s => 
      s.id === id ? { ...editedSanitization, isEditing: false } : s
    );
    setSanitizations(newSanitizations);
    saveToStorage('sanitizations', newSanitizations);
    setEditedSanitization(null);
  };

  const discardChanges = (id: string) => {
    setSanitizations(sanitizations.map(s => 
      s.id === id ? { ...s, isEditing: false } : s
    ));
    setEditedSanitization(null);
  };

  const toggleWebsite = (index: number) => {
    const newWebsites = websites.map((w, i) => 
      i === index ? { ...w, enabled: !w.enabled } : w
    );
    setWebsites(newWebsites);
    saveToStorage('websites', newWebsites);
  };

  const deleteWebsite = (index: number) => {
    const newWebsites = websites.filter((_, i) => i !== index);
    setWebsites(newWebsites);
    saveToStorage('websites', newWebsites);
  };

  const resetToDefaults = () => {
    setSanitizations([...DEFAULT_SANITIZATIONS]);
    saveToStorage('sanitizations', DEFAULT_SANITIZATIONS);
    setShowResetAlert(false);
  };

  const resetWebsitesToDefaults = () => {
    setWebsites([...DEFAULT_WEBSITES]);
    saveToStorage('websites', DEFAULT_WEBSITES);
    setShowDuplicateWebsiteError('Sites redefinidos para o padrão.');
  };

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 p-2 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleGlobalPause}
            className={`p-2 rounded ${isGloballyPaused ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {isGloballyPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <h1 className="text-xl font-bold">Sanitizador de PII</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button onClick={toggleDarkMode} className="p-2 rounded hover:bg-gray-700">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setShowInfoModal(true)} 
            className="p-2 rounded hover:bg-gray-700"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={() => setShowWebsitesModal(true)}
            className="p-2 rounded hover:bg-gray-700"
          >
            <Globe size={20} />
          </button>
          <button 
            onClick={() => setShowResetAlert(true)}
            className="p-2 rounded hover:bg-gray-700"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Reset Alert */}
      {showResetAlert && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Aviso</AlertTitle>
          <AlertDescription>
            Isso redefinirá todas as regras de sanitização para as configurações padrão. Quaisquer regras personalizadas serão perdidas.
            <div className="mt-4 space-x-4">
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={resetToDefaults}
              >
                Redefinir
              </button>
              <button 
                className="px-4 py-2 bg-gray-600 text-white rounded"
                onClick={() => setShowResetAlert(false)}
              >
                Cancelar
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowInfoModal(false)} />
          <div className={`relative w-full max-w-md rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-xl`}>
            <h2 className="text-xl font-bold mb-4">Sobre o Sanitizador de PII</h2>
            <div className="space-y-3 text-sm">
              <p>O Sanitizador de PII ajuda a proteger informações sensíveis ao detectar e substituir automaticamente informações de identificação pessoal (PII) em suas entradas de texto.</p>
              <p>Para usar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Adicione sites onde você deseja proteção de PII</li>
                <li>Crie regras de sanitização personalizadas ou use as padrões</li>
                <li>Alterne regras individuais ou pause toda a sanitização</li>
              </ol>
              <div className="mt-4">
                <a 
                  href="https://www.paypal.com/donate/?hosted_button_id=TPHPL2ZYZA2JL" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 hover:underline"
                >
                  Doar via Paypal
                </a>
                <span className="mx-2">•</span>
                <a 
                  href="https://github.com/dneverson/PII_Sanitizer_Extension" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 hover:underline"
                >
                  Ver Código Fonte
                </a>
              </div>
              <div className="mt-4">
                /* INSERT QR IMAGE HERE*/
              </div>
            </div>
            <button 
              onClick={() => setShowInfoModal(false)}
              className="mt-4 w-full p-2 bg-gray-600 text-white rounded"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Websites Modal */}
      {showWebsitesModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowWebsitesModal(false)} />
          <div className={`relative w-full max-w-md rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-xl`}>
            <h2 className="text-xl font-bold mb-4">Gerenciar Sites</h2>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                placeholder="Digite a URL do site"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                className={`flex-1 p-2 rounded text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
              />
              <button 
                onClick={addWebsite}
                className="p-2 bg-green-600 text-white rounded"
              >
                <Plus size={16} />
              </button>
            </div>
            {showDuplicateWebsiteError && (
              <div className="mb-4 p-2 bg-red-600 text-white text-sm rounded">
                {showDuplicateWebsiteError}
              </div>
            )}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {websites.map((site, index) => (
                //<div key={index} className="flex items-center justify-between p-2 rounded bg-gray-700">
                <div key={index} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}>
                  <span className="text-sm">{site.url}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleWebsite(index)}
                      className={`p-1 rounded ${site.enabled ? 'bg-yellow-600' : 'bg-green-600'}`}
                    >
                      {site.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={() => deleteWebsite(index)}
                      className="p-1 bg-red-600 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowWebsitesModal(false)}
              className="mt-4 w-full p-2 bg-gray-600 text-white rounded"
            >
              Fechar
            </button>
            <button 
              onClick={resetWebsitesToDefaults}
              className="mt-2 w-full p-2 bg-blue-600 text-white rounded"
            >
              Restaurar Sites Padrão
            </button>
          </div>
        </div>
      )}

      {/* Add New Sanitization */}
      <div className={`p-2 rounded-lg mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {showSanitizationError && (
          <div className="mb-2 p-2 bg-red-600 text-white text-sm rounded">
            {showSanitizationError}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            placeholder="Descrição"
            value={newSanitization.description}
            onChange={e => setNewSanitization({...newSanitization, description: e.target.value})}
            className={`w-full p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'}`}
          />
          <input
            type="text"
            placeholder="Padrão (texto a ser encontrado)"
            value={newSanitization.pattern}
            onChange={e => setNewSanitization({...newSanitization, pattern: e.target.value})}
            className={`w-full p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'}`}
          />
          <input
            type="text"
            placeholder="Valor de Substituição"
            value={newSanitization.replacement}
            onChange={e => setNewSanitization({...newSanitization, replacement: e.target.value})}
            className={`w-full p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'}`}
          />
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="isRegex"
              checked={newSanitization.isRegex}
              onChange={e => setNewSanitization({...newSanitization, isRegex: e.target.checked})}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="isRegex" className="text-sm">
              Usar Expressão Regular
            </label>
          </div>
          <button
            onClick={addSanitization}
            className="w-full p-2 bg-green-600 text-white rounded flex items-center justify-center"
          >
            <Plus size={20} className="mr-2" /> Adicionar Regra
          </button>
        </div>
      </div>

      {/* Sanitization List */}
      <div className="space-y-2">
        {sanitizations.map(sanitization => (
          <div
            key={sanitization.id}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
          >
            {sanitization.isEditing ? (
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  value={editedSanitization?.description || sanitization.description}
                  onChange={e => setEditedSanitization(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  className={`w-full p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'}`}
                />
                <input
                  type="text"
                  value={editedSanitization?.pattern || sanitization.pattern}
                  onChange={e => setEditedSanitization(prev => 
                    prev ? { ...prev, pattern: e.target.value } : null
                  )}
                  className={`w-full p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'}`}
                />
                <input
                  type="text"
                  value={editedSanitization?.replacement || sanitization.replacement}
                  onChange={e => setEditedSanitization(prev => 
                    prev ? { ...prev, replacement: e.target.value } : null
                  )}
                  className={`w-full p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'}`}
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`isRegex-${sanitization.id}`}
                    checked={editedSanitization?.isRegex || sanitization.isRegex}
                    onChange={e => setEditedSanitization(prev => 
                      prev ? { ...prev, isRegex: e.target.checked } : null
                    )}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor={`isRegex-${sanitization.id}`} className="text-sm">
                    Use Regular Expression
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-bold mb-1">{sanitization.description}</h3>
                <p className="text-sm opacity-90 mb-1">Padrão: {sanitization.pattern}</p>
                <p className="text-sm opacity-90">Substituição: {sanitization.replacement}</p>
                <p className="text-sm opacity-90 mt-1">Tipo: {sanitization.isRegex ? 'Expressão Regular' : 'Texto Simples'}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              {sanitization.isEditing ? (
                <>
                  <button
                    onClick={() => saveSanitization(sanitization.id)}
                    className="p-2 bg-green-600 rounded hover:bg-green-700"
                    title="Salvar"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={() => discardChanges(sanitization.id)}
                    className="p-2 bg-yellow-600 rounded hover:bg-yellow-700"
                    title="Descartar alterações"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => deleteSanitization(sanitization.id)}
                    className="p-2 bg-red-600 rounded hover:bg-red-700"
                    title="Excluir regra"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => toggleSanitization(sanitization.id)}
                    className={`p-2 rounded hover:opacity-80 ${sanitization.enabled ? 'bg-yellow-600' : 'bg-green-600'}`}
                    title={sanitization.enabled ? "Pausar regra" : "Retomar regra"}
                  >
                    {sanitization.enabled ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    onClick={() => editSanitization(sanitization)}
                    className="p-2 bg-blue-600 rounded hover:bg-blue-700"
                    title="Editar regra"
                  >
                    <Edit2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PIISanitizer;