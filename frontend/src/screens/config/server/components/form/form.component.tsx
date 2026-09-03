import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from './form.styles';

// A field the form renders. `kind` picks the input treatment; the screen owns the value and the
// onChange. Kept generic so one dumb component covers the Kavita-URL, API-key and BFF forms.
export interface FormField {
  key: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  // full-width (own line) vs. inline (shares the row with the confirm/cancel buttons)
  full?: boolean;
  secure?: boolean;
}

// An optional single-choice chip group (used by the BFF form's "link to Kavita" picker).
export interface FormChoice {
  label: string;
  options: Array<{ id: string | undefined; label: string }>;
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}

export interface FormProps {
  editingLabel?: string;
  fields: FormField[];
  choice?: FormChoice;
  submitting?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  // 'inline' → confirm/cancel sit on the same row as the (single, inline) field;
  // 'block'  → confirm/cancel are a right-aligned row under the fields.
  layout?: 'inline' | 'block';
}

export function Form({
  editingLabel,
  fields,
  choice,
  submitting,
  onSubmit,
  onCancel,
  layout = 'inline',
}: FormProps) {
  const renderField = (f: FormField) => (
    <View key={f.key} style={f.full || layout === 'block' ? undefined : { flex: 1 }}>
      {f.label && <Text style={styles.inputLabel}>{f.label}</Text>}
      <TextInput
        style={[f.full || layout === 'block' ? styles.inputFull : styles.input, f.error ? styles.inputError : null]}
        value={f.value}
        onChangeText={f.onChange}
        placeholder={f.placeholder}
        placeholderTextColor="#4A5568"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={f.autoFocus}
        secureTextEntry={f.secure}
      />
      {f.error ? <Text style={styles.errorTxt}>{f.error}</Text> : null}
    </View>
  );

  const confirm = (
    <TouchableOpacity
      style={[styles.okBtn, styles.okBtnPrimary, submitting && styles.btnDisabled]}
      onPress={onSubmit}
      disabled={submitting}>
      {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.okTxtWhite}>✓</Text>}
    </TouchableOpacity>
  );
  const cancel = (
    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
      <Text style={styles.cancelTxt}>✕</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.card}>
      {editingLabel && <Text style={styles.editLabel}>{editingLabel}</Text>}

      {layout === 'inline' ? (
        <View style={styles.inlineRow}>
          {fields.map(renderField)}
          {confirm}
          {cancel}
        </View>
      ) : (
        <>
          {fields.map(renderField)}
          {choice && (
            <>
              <Text style={styles.inputLabel}>{choice.label}</Text>
              <View style={styles.linkOptions}>
                {choice.options.map(opt => {
                  const selected = opt.id === choice.selectedId;
                  return (
                    <TouchableOpacity
                      key={opt.id ?? '__none__'}
                      style={[styles.linkChip, selected && styles.linkChipActive]}
                      onPress={() => choice.onSelect(opt.id)}>
                      <Text style={[styles.linkChipTxt, selected && styles.linkChipTxtActive]} numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
          <View style={styles.actions}>
            {cancel}
            {confirm}
          </View>
        </>
      )}
    </View>
  );
}
