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
  it('sempre inclui o texto de fim de capitulo', () => {
    const node = buildLastNode('Fim do capítulo', 'Próximo:', null);
    expect(collectTexts(node)).toContain('Fim do capítulo');
  });

  it('sem proximo capitulo, tem apenas um filho (o texto de fim de capitulo)', () => {
    const node = buildLastNode('Fim do capítulo', 'Próximo:', null);
    if (node.type !== 'container') throw new Error('expected container');
    expect(node.children).toHaveLength(1);
  });

  it('com proximo capitulo, inclui o label e o titulo do proximo', () => {
    const node = buildLastNode('Fim do capítulo', 'Próximo:', 'Capítulo 42. O Retorno');
    const texts = collectTexts(node);
    expect(texts).toContain('Próximo:');
    expect(texts).toContain('Capítulo 42. O Retorno');
  });
});
