# 📊 Bundle Analyzer - Guia de Uso

## 🎯 O que é?

O Bundle Analyzer cria uma **visualização interativa** do seu bundle JavaScript, mostrando:
- 📦 Tamanho de cada arquivo/módulo
- 🔍 Quais dependências ocupam mais espaço
- 📈 Comparação gzipped vs brotli vs raw
- 🌳 Hierarquia de imports (treemap)

---

## 🚀 Como usar

### 1. Build com análise

```bash
npm run build:analyze
```

**O que acontece**:
1. Build de produção normal
2. Gera arquivo `dist/stats.html`
3. **Abre automaticamente no browser** 🎉

---

## 🔍 O que procurar

### ⚠️ RED FLAGS (Problemas)

1. **Vendor chunk > 300KB gzipped**
   - Solução: Code splitting mais agressivo

2. **Libs duplicadas**
   - Solução: Consolidar em 1 chunk ou trocar lib

3. **Deps desnecessárias**
   - Solução: Tree-shaking ou remover

---

## 📊 Exemplo - ANTES vs DEPOIS

### ANTES:
- Total: 1.27MB (560KB gzipped) ❌

### DEPOIS:
- Total: 785KB (277KB gzipped) ✅
- **Melhoria: -38%!**

---

## 🎯 Targets (Ecotopia)

- ✅ Total: ~500KB gzipped
- ✅ Initial: ~200KB gzipped
- ✅ Lazy: ~50-100KB cada

---

**Rode agora**: `npm run build:analyze` 🚀
