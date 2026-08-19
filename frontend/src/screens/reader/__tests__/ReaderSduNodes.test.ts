import { buildFirstNode, buildLastNode } from '../ReaderSduNodes';
import type { SduNode } from '../SduNode';

function collectTexts(node: SduNode): string[] {
  if (node.type === 'text') return [node.text];
  if (node.type === 'container') return node.children.flatMap(collectTexts);
  return [];
}

describe('buildFirstNode', () => {
  it('inclui o texto do titulo do capitulo', () => {
    const node = buildFirstNode('Capítulo 41', false);
    expect(collectTexts(node)).toContain('Capítulo 41');
  });

  it('sem Gap acima, o node raiz e diretamente o container do titulo (sem aninhamento extra)', () => {
    const node = buildFirstNode('Capítulo 41', false);
    expect(node.type).toBe('container');
    if (node.type !== 'container') throw new Error('expected container');
    // Filho direto é o texto do título, não outro container (isso indicaria um Gap aninhado).
    expect(node.children.some(child => child.type === 'container')).toBe(false);
  });

  it('com Gap acima, o node raiz aninha [gap, header] como containers filhos', () => {
    const node = buildFirstNode('Capítulo 41', true);
    expect(node.type).toBe('container');
    if (node.type !== 'container') throw new Error('expected container');
    expect(node.children).toHaveLength(2);
    expect(node.children.every(child => child.type === 'container')).toBe(true);
  });
});

describe('buildLastNode', () => {
  it('inclui o texto de fim de capitulo e o numero do capitulo', () => {
    const node = buildLastNode('Fim do capítulo', '40', 'Próximo:', null);
    const texts = collectTexts(node);
    expect(texts.join('')).toContain('Fim do capítulo');
    expect(texts).toContain('40');
  });

  it('o numero do capitulo e um texto separado do prefixo (para poder ficar em negrito)', () => {
    const node = buildLastNode('Fim do capítulo', '40', 'Próximo:', null);
    if (node.type !== 'container') throw new Error('expected container');
    expect(node.children).toHaveLength(2);
    const numberNode = node.children.find(child => child.type === 'text' && child.text === '40');
    expect(numberNode).toBeDefined();
    if (numberNode?.type !== 'text') throw new Error('expected text');
    expect(numberNode.bold).toBe(true);
  });

  it('nao inclui a previa do proximo capitulo mesmo quando ha um next carregado (oculto por enquanto)', () => {
    const node = buildLastNode('Fim do capítulo', '40', 'Próximo:', 'Capítulo 42. O Retorno');
    const texts = collectTexts(node);
    expect(texts).not.toContain('Próximo:');
    expect(texts).not.toContain('Capítulo 42. O Retorno');
  });
});
