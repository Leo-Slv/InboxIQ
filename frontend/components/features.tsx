import { FileText, Mail, Type } from "lucide-react";

const features = [
  {
    icon: Type,
    title: "Cole o texto do e-mail",
    description:
      "Insira o conteúdo diretamente no campo de texto para classificar e gerar uma resposta sugerida.",
  },
  {
    icon: FileText,
    title: "Envie um arquivo (.pdf ou .txt)",
    description:
      "Anexe um arquivo para extrair o conteúdo automaticamente e obter a resposta ideal em segundos.",
  },
  {
    icon: Mail,
    title: "Conecte seu Gmail e responda",
    description:
      "Selecione um e-mail da sua caixa de entrada, analise com IA e responda no mesmo thread com um clique.",
  },
];

const Features = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12" id="feat">
      <div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center">
          Transforme sua caixa de entrada
        </h2>

        <div className="mt-10 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-(--breakpoint-lg) mx-auto px-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col border rounded-xl py-6 px-5"
            >
              <div className="mb-4 h-10 w-10 flex items-center justify-center bg-muted rounded-full">
                <feature.icon className="size-5" />
              </div>

              <span className="text-lg font-semibold">{feature.title}</span>
              <p className="mt-1 text-foreground/80 text-[15px]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
