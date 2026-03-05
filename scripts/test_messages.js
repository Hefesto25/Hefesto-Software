import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase
        .from('mensagens')
        .select(`
            *,
            autor:usuarios!autor_id(id, nome, email, foto_url),
            mensagem_original:mensagens!resposta_de(id, conteudo, autor:usuarios!autor_id(nome))
        `)
        .limit(5);

    console.log(JSON.stringify(data, null, 2));
}

run();
