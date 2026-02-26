import { supabase } from './lib/supabase';

async function fixTasks() {
    console.log('Migrating pendente -> A Fazer...');
    const res1 = await supabase.from('tarefas_operacionais').update({ status: 'A Fazer' }).eq('status', 'pendente');
    console.log(res1);

    console.log('Migrating concluido -> Finalizado...');
    const res2 = await supabase.from('tarefas_operacionais').update({ status: 'Finalizado' }).eq('status', 'concluido');
    console.log(res2);

    console.log('Done migrating task statuses.');
}

fixTasks();
