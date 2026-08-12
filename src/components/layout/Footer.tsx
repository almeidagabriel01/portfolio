import { Github, Linkedin } from "lucide-react";

/**
 * Nomes próprios: iguais nos dois idiomas, então não vão para o dicionário.
 * Exportado porque a seção de contato lista as mesmas redes. Duas cópias das
 * URLs divergem na primeira troca de perfil.
 */
export const SOCIAL = [
  {
    href: "https://github.com/almeidagabriel01",
    label: "GitHub",
    Icon: Github,
  },
  {
    href: "https://www.linkedin.com/in/gabrielalmeidadias/",
    label: "LinkedIn",
    Icon: Linkedin,
  },
];

/**
 * Server component: nenhum texto localizado, nenhum hook. Não há razão para
 * mandar este JS para o cliente.
 */
export function Footer() {
  return (
    // A barra inferior é toda em mono caixa-alta, com o mesmo
    // contêiner das seções (`w-calc`) e uma régua de 1px acima. É o registro
    // "legenda", não "corpo", daí `type-sub` em vez de `type-m-16`.
    <footer className="relative z-10 border-t border-line py-32">
      <div className="w-calc flex flex-col items-start gap-20 sm:flex-row sm:items-center sm:justify-between">
        <p className="type-sub text-ink/55">
          © {new Date().getFullYear()} Gabriel Almeida Dias
        </p>
        <ul className="flex items-center gap-32">
          {SOCIAL.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-8 type-sub text-ink/55 transition-colors duration-200 hover:text-ink motion-reduce:transition-none"
              >
                <Icon aria-hidden className="size-12" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
