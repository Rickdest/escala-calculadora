import { useState } from 'react';
import { Plus, X, Tag, Sparkles } from 'lucide-react';
import { ProductAttribute, ATTRIBUTE_PRESETS } from '@/types/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AttributeBuilderProps {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
}

export function AttributeBuilder({ attributes, onChange }: AttributeBuilderProps) {
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});

  const addAttribute = (name?: string) => {
    const attrName = name || '';
    const presetValues = name && ATTRIBUTE_PRESETS[name] ? ATTRIBUTE_PRESETS[name] : [];
    const newAttr: ProductAttribute = {
      id: Math.random().toString(36).substring(2, 15),
      name: attrName,
      values: presetValues,
    };
    onChange([...attributes, newAttr]);
  };

  const removeAttribute = (id: string) => {
    onChange(attributes.filter(a => a.id !== id));
  };

  const updateAttributeName = (id: string, name: string) => {
    onChange(attributes.map(a => a.id === id ? { ...a, name } : a));
  };

  const addValue = (attrId: string) => {
    const val = (newValueInputs[attrId] || '').trim();
    if (!val) return;
    onChange(attributes.map(a => {
      if (a.id !== attrId) return a;
      if (a.values.includes(val)) return a;
      return { ...a, values: [...a.values, val] };
    }));
    setNewValueInputs(prev => ({ ...prev, [attrId]: '' }));
  };

  const removeValue = (attrId: string, value: string) => {
    onChange(attributes.map(a =>
      a.id === attrId ? { ...a, values: a.values.filter(v => v !== value) } : a
    ));
  };

  const applyPreset = (attrId: string, presetName: string) => {
    const preset = ATTRIBUTE_PRESETS[presetName];
    if (!preset) return;
    onChange(attributes.map(a => {
      if (a.id !== attrId) return a;
      const merged = [...new Set([...a.values, ...preset])];
      return { ...a, values: merged };
    }));
  };

  const usedPresets = attributes.map(a => a.name);
  const availablePresets = Object.keys(ATTRIBUTE_PRESETS).filter(p => !usedPresets.includes(p));

  return (
    <div className="space-y-4">
      {attributes.map((attr) => (
        <div key={attr.id} className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary flex-shrink-0" />
            <Input
              value={attr.name}
              onChange={(e) => updateAttributeName(attr.id, e.target.value)}
              placeholder="Nome do atributo (ex: Tamanho)"
              className="input-modern h-9 text-sm font-semibold flex-1"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => removeAttribute(attr.id)} className="h-8 w-8 p-0 text-destructive flex-shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Values as chips */}
          <div className="flex flex-wrap gap-2">
            {attr.values.map((val) => (
              <Badge key={val} variant="secondary" className="gap-1 pr-1 text-xs">
                {val}
                <button type="button" onClick={() => removeValue(attr.id, val)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Add value */}
          <div className="flex gap-2">
            <Input
              value={newValueInputs[attr.id] || ''}
              onChange={(e) => setNewValueInputs(prev => ({ ...prev, [attr.id]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(attr.id); } }}
              placeholder="Adicionar valor e pressionar Enter"
              className="input-modern h-9 text-sm flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => addValue(attr.id)} className="h-9 px-3">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Preset suggestions */}
          {attr.name && ATTRIBUTE_PRESETS[attr.name] && (
            <button
              type="button"
              onClick={() => applyPreset(attr.id, attr.name)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Sparkles className="w-3 h-3" />
              Adicionar sugestões: {ATTRIBUTE_PRESETS[attr.name].join(', ')}
            </button>
          )}
        </div>
      ))}

      {/* Add attribute buttons */}
      <div className="space-y-2">
        {availablePresets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availablePresets.map(preset => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addAttribute(preset)}
                className="text-xs gap-1"
              >
                <Sparkles className="w-3 h-3 text-primary" />
                {preset}
              </Button>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => addAttribute()} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Atributo Personalizado
        </Button>
      </div>
    </div>
  );
}
