import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  fraction: number;
  // % da página atual isolada (0..1) — usada só no modo debug, ao lado do "Y%" do capítulo
  // inteiro, pra distinguir visualmente "quanto desta imagem já rolou" de "quanto do capítulo
  // já foi lido".
  pageFraction?: number;
}

// Liga o modo debug (label numérico, marcas de 10%, cores de alto contraste) usado para validar
// visualmente se o preenchimento acompanha scrollFraction/chapterFraction 1:1 durante a
// investigação da barra de progresso. Desligado por padrão — reativar aqui quando for preciso
// depurar de novo em vez de reescrever o componente.
const DEBUG_MODE = false;

export function ReaderThinProgressBar({ fraction, pageFraction = 0 }: Props) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const clampedPage = Math.min(1, Math.max(0, pageFraction));
  const percentLabel = `${(clampedPage * 100).toFixed(1)}% <${(clamped * 100).toFixed(1)}%>`;

  return (
    <View style={DEBUG_MODE ? styles.trackDebug : styles.track}>
      <View
        testID="reader-thin-progress-fill"
        style={[
          DEBUG_MODE ? styles.fillDebug : styles.fill,
          { position: 'absolute', top: 0, height: `${clamped * 100}%` },
        ]}
      />
      {DEBUG_MODE && (
        <>
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(percent => (
            <View key={percent} style={[styles.tickMark, { top: `${percent}%` }]} />
          ))}
          <View style={[styles.labelWrapper, { top: `${clamped * 100}%` }]}>
            <Text testID="reader-thin-progress-label" style={styles.label}>
              {percentLabel}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Aparência final: barra fina, dourada, translúcida.
  track: {
    position: 'absolute',
    right: 4,
    top: '10%',
    bottom: '10%',
    width: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'visible',
  },
  fill: { width: 3, backgroundColor: '#FFC107' },

  // TEMP DEBUG: cores/largura de alto contraste + label numérico + marcas de 10% para acompanhar
  // visualmente o teste do scrollFraction/chapterFraction. Ativado via DEBUG_MODE acima.
  trackDebug: {
    position: 'absolute',
    right: 4,
    top: '10%',
    bottom: '10%',
    width: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: '#00BFFF',
    backgroundColor: '#000000',
    overflow: 'visible',
  },
  fillDebug: { width: 13, backgroundColor: '#FF00FF' },
  tickMark: {
    position: 'absolute',
    left: 0,
    width: 13,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  labelWrapper: {
    position: 'absolute',
    left: -120,
    alignItems: 'flex-end',
    width: 116,
    transform: [{ translateY: -8 }],
  },
  label: {
    color: '#00BFFF',
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
