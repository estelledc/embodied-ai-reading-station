                                                  Code as Policies: Language Model Programs for Embodied Control
                                                        Jacky Liang, Wenlong Huang, Fei Xia, Peng Xu, Karol Hausman, Brian Ichter, Pete Florence, Andy Zeng

                                                                                                       Robotics at Google


                                             Abstract— Large language models (LLMs) trained on code-                                                                                   User

                                         completion have been shown to be capable of synthesizing simple             Large                       Stack the blocks on the empty bowl.
                                         Python programs from docstrings [1]. We find that these code-writing        Language
                                         LLMs can be re-purposed to write robot policy code, given natural           Model                               Perception APIs
                                         language commands. Specifically, policy code can express functions                                              Control APIs
                                         or feedback loops that process perception outputs (e.g., from object          Policy Code
                                         detectors [2], [3]) and parameterize control primitive APIs. When          block_names = detect_objects("blocks")
                                                                                                                    bowl_names = detect_objects("bowls")
                                         provided as input several example language commands (formatted             for bowl_name in bowl_names:
                                                                                                                      if is_empty(bowl_name):




arXiv:2209.07753v4 [cs.RO] 25 May 2023
                                         as comments) followed by corresponding policy code (via few-shot               empty_bowl = bowl_name
                                                                                                                        break
                                         prompting), LLMs can take in new commands and autonomously                 objs_to_stack = [empty_bowl] + block_names
                                         re-compose API calls to generate new policy code respectively. By          stack_objects(objs_to_stack)

                                         chaining classic logic structures and referencing third-party libraries                 def is_empty(name):
                                                                                                                                   ...
                                         (e.g., NumPy, Shapely) to perform arithmetic, LLMs used in this way        def stack_objects(obj_names):
                                                                                                                      n_objs = len(obj_names)
                                         can write robot policies that (i) exhibit spatial-geometric reasoning,       for i in range(n_objs - 1):
                                                                                                                        obj0 = obj_names[i + 1]
                                         (ii) generalize to new instructions, and (iii) prescribe precise values        obj1 = obj_names[i]
                                         (e.g., velocities) to ambiguous descriptions (“faster”) depending              pick_place(obj0, obj1)

                                         on context (i.e., behavioral commonsense). This paper presents
                                                                                                                   Fig. 1: Given examples (via few-shot prompting), robots can use code-writing
                                         Code as Policies: a robot-centric formulation of language model
                                                                                                                   large language models (LLMs) to translate natural language commands into robot
                                         generated programs (LMPs) that can represent reactive policies (e.g.,     policy code which process perception outputs, parameterize control primitives,
                                         impedance controllers), as well as waypoint-based policies (vision-       recursively generate code for undefined functions, and generalize to new tasks.
                                         based pick and place, trajectory-based control), demonstrated across
                                         multiple real robot platforms. Central to our approach is prompting       LLMs be applied beyond just planning a sequence of skills?
                                         hierarchical code-gen (recursively defining undefined functions),            Herein, we find that code-writing LLMs [1], [11], [22] are
                                         which can write more complex code and also improves state-of-the-         proficient at going further: orchestrating planning, policy logic, and
                                         art to solve 39.8% of problems on the HumanEval [1] benchmark.            control. LLMs trained on code-completion have shown to be capa-
                                         Code and videos are available at https://code-as-policies.github.io
                                                                                                                   ble of synthesizing Python programs from docstrings. We find that
                                                                 I. INTRODUCTION                                   these models can be re-purposed to write robot policy code, given
                                                                                                                   natural language commands (formatted as comments). Policy code
                                            Robots that use language need it to be grounded (or situated)          can express functions or feedback loops that process perception
                                         to reference the physical world and bridge connections between            outputs (e.g., open vocabulary object detectors [2], [3]) and param-
                                         words, percepts, and actions [4]. Classic methods ground language         eterize control primitive APIs (see Fig. 1). When provided with
                                         using lexical analysis to extract semantic representations that           several example language commands followed by corresponding
                                         inform policies [5]–[7], but they often struggle to handle unseen         policy code (via few-shot prompting, in gray), LLMs can take in
                                         instructions. More recent methods learn the grounding end-to-end          new commands (in green) and autonomously re-compose the API
                                         (language to action) [8]–[10], but they require copious amounts           calls to generate new policy code (highlighted) respectively:
                                         of training data, which can be expensive to obtain on real robots.        # if you see an orange, move backwards.
                                            Meanwhile, recent progress in natural language processing              if detect_object("orange"):
                                                                                                                      robot.set_velocity(x=-0.1, y=0, z=0)
                                         shows that large language models (LLMs) pretrained on Internet-           # move rightwards until you see the apple.
                                         scale data [11]–[13] exhibit out-of-the-box capabilities [14]–[16]        while not detect_object("apple"):
                                                                                                                       robot.set_velocity(x=0, y=0.1, z=0)
                                         that can be applied to language-using robots e.g., planning a
                                         sequence of steps from natural language instructions [16]–[18]            Code-writing models can express a variety of arithmetic operations
                                         without additional model finetuning. These steps can be grounded          as well as feedback loops grounded in language. They not only
                                         in real robot affordances from value functions among a fixed set          generalize to new instructions, but having been trained on billions
                                         of skills i.e., policies pretrained with behavior cloning or rein-        of lines of code and comments, can also prescribe precise values
                                         forcement learning [19]–[21]. While promising, this abstraction           (e.g., velocities) to ambiguous descriptions ("faster" and "to the
                                         prevents the LLMs from directly influencing the perception-action         left") depending on context – to elicit behavioral commonsense:
                                         feedback loop, making it difficult to ground language in ways that        # do it again but faster, to the left, and with a banana.
                                                                                                                   while not detect_object("banana"):
                                         (i) generalize modes of feedback that share percepts and actions              robot.set_velocity(x=0, y=-0.2, z=0)
                                         e.g., from "put the apple down on the orange" to "put the apple
                                         down when you see the orange", (ii) express commonsense priors            Representing code as policies inherits a number of benefits from
                                         in control e.g., "move faster", "push harder", or (iii) comprehend        LLMs: not only the capacity to interpret natural language, but also
                                         spatial relationships "move the apple a bit to the left". As a result,    the ability to engage in human-robot dialogue and Q&A simply
                                         incorporating each new skill (and mode of grounding) requires             by using "say(text)" as an available action primitive API:
                                                                                                                   # tell me why you stopped moving.
                                         additional data and retraining – ergo the data burden persists,           robot.say("I stopped moving because I saw a banana.")
                                         albeit passed to skill acquisition. This leads us to ask: how can
        User                                                  User                                                      User                                                                  User
                                                                                                                                                                                               Take the coke can from the desk and put it in the middle
        Put the blocks in bowls with non-matching colors      Wait until you see an egg and put it in the green plate    Draw a smaller pyramid a little bit to the left of the pyramid
                                                                                                                                                                                               of the fruits on the table.




        User                                                  User                                                      User                                                                 User
        Put the blocks in a vertical line 20 cm long and 10                                                                                                                                   Put away the coke can and the apple in their
                                                              Put the darkest object in the plate that has the apple    Draw a square around the sweeter fruit
        cm below the blue bowl                                                                                                                                                                corresponding bins




                               (a)                                                   (b)                                                            (c)                                                                (d)

Fig. 2: Code as Policies can follow natural language instructions across diverse domains and robots: table-top manipulation (a)-(b), 2D shape drawing (c), and mobile
manipulation in a kitchen with robots from Everyday Robots (d). Our approach enables robots to perform spatial-geometric reasoning, parse object relationships, and form
multi-step behaviors using off-the-shelf models and few-shot prompting with no additional training. See full videos and more tasks at code-as-policies.github.io

   We present Code as Policies (CaP): a robot-centric formulation                                                          Large language models exhibit impressive zero-shot reasoning
of language model generated programs (LMPs) executed on real                                                            capabilities: from planning [14] to writing math programs [43];
systems. Pythonic LMPs can express complex policies using:                                                              from solving science problems [44] to using trained verifiers [45]
• Classic logic structures e.g., sequences, selection (if/else), and                                                    for math word problems. These can be improved with prompting
   loops (for/while) to assemble new behaviors at runtime.                                                              methods such as Least-to-Most [46], Think-Step-by-Step [15]
• Third-party libraries to interpolate points (NumPy), analyze and                                                      or Chain-of-Thought [47]. Most closely related to this paper are
   generate shapes (Shapely) for spatial-geometric reasoning, etc.                                                      works that use LLM capabilities for robot agents without additional
                                                                                                                        model training. For example, Huang et al. decompose natural lan-
LMPs can be hierarchical: prompted to recursively define new
                                                                                                                        guage commands into sequences of executable actions by text com-
functions, accumulate their own libraries over time, and self-
                                                                                                                        pletion and semantic translation [14], while SayCan [17] generates
architect a dynamic codebase. We demonstrate across several robot
                                                                                                                        feasible plans for robots by jointly decoding an LLM weighted by
systems that LLMs can autonomously interpret language com-
                                                                                                                        skill affordances [20] from value functions. Inner Monologue [18]
mands to generate LMPs that represent reactive low-level policies
                                                                                                                        expands LLM planning by incorporating outputs from success de-
(e.g., PD or impedance controllers), and waypoint-based policies
                                                                                                                        tectors or other visual language models and uses their feedback to
(e.g., for vision-based pick and place, or trajectory-based control).
                                                                                                                        re-plan. Socratic Models [16] uses visual language models to sub-
   Our main contributions are: (i) code as policies: a formulation
                                                                                                                        stitute perceptual information (in teal) into the language prompts
of using LLMs to write robot code, (ii) a method for hierarchical
                                                                                                                        that generate plans, and it uses language-conditioned policies e.g.,
code-gen that improves state-of-the-art on both robotics and
                                                                                                                        for grasping [36]. The following example illustrates the qualitative
standard code-gen problems with 39.8% P@1 on HumanEval
                                                                                                                        differences between our approach versus the aforementioned prior
[1], (iii) a new benchmark to evaluate future language models on
                                                                                                                        works. When tasked to "move the coke can a bit to the right":
robotics code-gen problems, and (iv) ablations that analyze how
CaP improves metrics of generalization [23] and that it abides                                                           LLM Plan [14], [17], [18]                                        Socratic Models Plan [16]
                                                                                                                         1. Pick up coke can                                              objects = [coke can]
by scaling laws – larger models perform better. Code as policies                                                         2. Move a bit right                                              1. robot.grasp(coke can) open vocab
presents a new approach to linking words, percepts, and actions;                                                         3. Place coke can                                                2. robot.place_a_bit_right()

enabling applications in human-robot interaction, but is not without
limitations. We discuss these in Sec. V. Full prompts and generated                                                     plans generated by prior works assume there exists a skill that
outputs are in the Appendix, which can be found along with                                                              allows the robot to move an object a bit right. Our approach differs
additional results, videos, and code at code-as-policies.github.io                                                      in that it uses an LLM to directly generate policy code (plans
                                                                                                                        nested within) to run on the robot and avoids the requirement of
                                       II. RELATED WORK
                                                                                                                        having predefined policies to map every step in the plan:
   Controlling robots via language has a long history, including                                                        Code as Policies (ours)
                                                                                                                        while not obj_in_gripper("coke can"):
early demonstrations of human-robot interaction through lexical                                                            robot.move_gripper_to("coke can")
parsing of natural language [5]. Language serves not only as an                                                         robot.close_gripper()
                                                                                                                        pos = robot.gripper.position
interface for non-experts to interact with robots [24], [25], but also                                                  robot.move_gripper(pos.x, pos.y+0.1, pos.z)
as a means to compositionally scale generalization to new tasks [9],                                                    robot.open_gripper()

[17]. The literature is vast (we refer to Tellex et al. [4] and Luketina                                                Our approach (CaP) not only leverages logic structures to specify
et al. [26] for comprehensive surveys), but recent works fall broadly                                                   feedback loops, but it also parameterizes (and write parts of)
into the categories of high-level interpretation (e.g., semantic                                                        low-level control primitives. CaP alleviates the need to collect data
parsing [25], [27]–[32]), planning [14], [17], [18], and low-level                                                      and train a fixed set of predefined skills or language-conditioned
policies (e.g., model-based [33]–[35], imitation learning [8], [9],                                                     policies – which are expensive and often remain domain-specific.
[36], [37], or reinforcement learning [38]–[42]). In contrast, our                                                         Code generation has been explored with LLMs [1], [48] and
work focuses on the code generation aspect of LLMs and use the                                                          without [49]. Program synthesis has been demonstrated to be
generated procedures as an expressive way to control the robot.                                                         capable of drawing simple figures [50] and generating policies
that solve 2D tasks [51]. We expand on these works, showing that          A. Prompting Language Model Programs
(i) code-writing LLMs enable novel reasoning capabilities (e.g., en-
                                                                          Prompts to generate LMPs contain two elements:
coding spatial relationships by leaning on familiarity of third party
                                                                          1. Hints e.g., import statements that inform the LLM which APIs
libraries) without additional training needed in prior works [35],
                                                                          are available and type hints on how to use those APIs.
[36], [52]–[56], and (ii) hierarchical code-writing (inspired by re-
cursive summarization [57]) improves state-of-the-art code genera-         import numpy as np
tion. We also present a new robotics-themed code-gen benchmark             from utils import get_obj_names, put_first_on_second

to evaluate future language models in the robotics domain.
                                                                          2. Examples are instruction-to-code pairs that present few-shot
                                                                          "demonstrations" of how natural language instructions should be
                            III. METHOD                                   converted into code. These may include performing arithmetic,
                                                                          calling other APIs, and other features of the programming
    In this section, we characterize the extent to which pretrained
                                                                          language. Instructions are written as comments directly preceding
LLMs can be prompted to generate code as policies – represented
                                                                          a block of corresponding solution code. We can maintain an
as a set of language model programs (LMPs). Broadly, we use the
                                                                          LMP "session" by incrementally appending new instructions and
term LMP to refer to any program generated by a language model
                                                                          responses to the prompt, allowing later instructions to refer back
and executed on a system. This work investigates Code as Policies,
                                                                          to previous instructions, like "undo the last action".
a class of LMPs that maps from language instructions to code snip-
pets that (i) react to perceptual inputs (i.e., from sensors or modules
                                                                          B. Example Language Model Programs (Low-Level)
on top of sensors), (ii) parameterize control primitive APIs, and
(iii) are directly compiled and executed on a robot, for example:            LMPs are perhaps best understood through examples, to
                                                                          which the following section builds up from simple pure-Python
 # stack the blocks in the empty bowl.
 empty_bowl_name = parse_obj(’empty bowl’)
                                                                          instructions to more complex ones that can complete robot
 block_names = parse_obj(’blocks’)                                        tasks. All examples and experiments in this paper, unless
 obj_names = [empty_bowl_name] + block_names
 stack_objs_in_order(obj_names=obj_names)
                                                                          otherwise stated, use OpenAI Codex code-davinci-002 with
                                                                          temperature 0 (i.e., deterministic greedy token decoding). Here,
Input instructions are formatted as comments (green), which can be        the prompt (in gray) starts with a Hint to indicate we are writing
provided by humans or written by another LMP. Predicted outputs           Python. It then gives one Example to specify the format of the
from the LLM (highlighted) are expected to be valid Python                return values, to be assigned to a variable called ret_val. Input
code, generated autoregressively [11], [12]. LMPs are few-shot            instructions are green, and generated outputs are highlighted:
prompted with examples to generate different subprograms that              # Python script
may process object detection results, build trajectories, or sequence      # get the variable a.
                                                                           ret_val = a
control primitives. LMPs can be generated hierarchically by com-           # find the sum of variables a and b.
posing known functions (e.g., get_obj_names() using perception             ret_val = a + b
                                                                           # see if any number is divisible by 3 in a list called xs.
modules) or invoking other LMPs to define undefined functions:             ret_val = any(x % 3 == 0 for x in xs)

 # define function stack_objs_in_order(obj_names).
 def stack_objs_in_order(obj_names):                                      Third-party libraries. Python code-writing LLMs store
     for i in range(len(obj_names) - 1):                                  knowledge of many popular libraries. LMPs can be prompted to
        put_first_on_second(obj_names[i + 1], obj_names[i])
                                                                          use these libraries to perform complex instructions without writing
                                                                          all of the code e.g., using NumPy to elicit spatial reasoning with
where put_first_on_second is an existing open vocabulary pick
                                                                          coordinates. Hints here include import statements, and Examples
and place primitive (e.g., CLIPort [36]). For new embodiments,
                                                                          define cardinal directions. Variable names are also important to
these active function calls can be replaced with available control
                                                                          indicate that pts_np and pt_np are NumPy arrays. Operations
APIs that represent the action space (e.g., set_velocity) of
                                                                          with 2D vectors imply that the points are also 2D. Example:
the agent. Hierarchical code-gen with verbose variable names
can be viewed as a variant of chain of thought prompting [47]
                                                                           import numpy as np
via functional programming. Functions defined by LMPs can                  # move all points in pts_np toward the right.
progressively accumulate over time, where new LMPs can                     ret_val = pts_np + [0.3, 0]
                                                                           # move a pt_np toward the top.
reference previously constructed functions to expand policy logic.         ret_val = pt_np + [0, 0.3]
   To execute an LMP, we first check that it is safe to run by             # get the left most point in pts_np.
                                                                           ret_val = pts_np[np.argmin(pts_np[:, 0]), :]
ensuring there are no import statements, special variables that            # get the center of pts_np.
begin with __, or calls to exec and eval. Then, we call Python’s           ret_val = np.mean(pts_np, axis=0)
                                                                           # the closest point in pts_np to pt_np.
exec function with the code as the input string and two dictionaries       ret_val = pts_np[np.argmin(np.sum((pts_np - pt_np)**2, axis=1))]
that form the scope of that code execution: (i) globals, containing
all APIs that the generated code might call, and (ii) locals, an          First-party libraries. LMPs can also use first-party libraries
empty dictionary which will be populated with variables and new           (perception or control primitive APIs) not found in the training
functions defined during exec. If the LMP is expected to return           data if those functions have meaningful names and are provided
a value, we obtain it from locals after exec finishes.                    in Hints/Examples. For example (full prompt in B.2):
from utils import get_pos, put_first_on_second                             import numpy as np
...                                                                        from utils import get_obj_bbox_xyxy
# move the purple bowl toward the left.                                    # define function: total = get_total(xs).
target_pos = get_pos(’purple bowl’) + [-0.3, 0]                            def get_total(xs):
put_first_on_second(’purple bowl’, target_pos)                                return np.sum(xs)
objs = [’blue bowl’, ’red block’, ’red bowl’, ’blue block’]                # define function: get_objs_bigger_than_area_th(obj_names, bbox_area_th).
# move the red block a bit to the right.                                   def get_objs_bigger_than_area_th(obj_names, bbox_area_th):
target_pos = get_pos(’red block’) + [0.1, 0]                                   return [name for name in obj_names
put_first_on_second(’red block’, target_pos)                                           if get_obj_bbox_area(name) > bbox_area_th]
# put the blue block on the bowl with the same color.
put_first_on_second(’blue block’, ’blue bowl’)
                                                                          Function generation can be implemented by parsing the code gen-
The Hints import two functions for a robot domain: one to obtain          erated by an LMP, locating yet-to-be-defined functions, and calling
the 2D position of an object by name (using an open vocabulary            another LMP specialized in function-generation to create those
object detector [2]) and another to put the first object on the           functions. This allows both the prompt and the code generated
second target, which can be an object name or a 2D position.              by LMPs to call yet-to-be-defined functions. The prompt engineer
Note the LMP’s ability to adapt to new instructions — the first           would no longer need to provide all implementation details in
modifies the movement magnitude by using "a bit," while the               Examples — a "rough sketch" of the code logic may suffice.
second associates the object with "the same color."                       High-level LMPs can also follow good abstraction practices and
Language reasoning can be few-shot prompted using code-                   avoid "flattening" all the code logic onto one level. In addition
writing LLMs (full prompt in B.1) to e.g., associate object               to making the resultant code easier to read, this improves code
names with natural language descriptions ("sea-colored block"),           generation performance as shown in Section IV-A. Locating yet-
categories ("bowls"), or past context ("other block"):                    to-be-defined functions is also done within the body of generated
                                                                          functions. Note in the example above, get_obj_bbox_area is not
objs = [’blue bowl’, ’red block’, ’red bowl’, ’blue block’]
# the bowls.                                                              a provided API call. Instead, it can be generated as needed:
ret_val = [’blue bowl’, ’red bowl’]
# sea-colored block.                                                       # define function: get_obj_bbox_area(obj_name).
ret_val = ’blue block’                                                     def get_obj_bbox_area(obj_name):
# the other block.                                                             x1, y1, x2, y2 = get_obj_bbox_xyxy(obj_name)
ret_val = ’red block’                                                          return (x2 - x1) * (y2 - y1)

C. Example Language Model Programs (High-Level)                           Note the prompt did not specify exactly what get_obj_bbox_xyxy
Control flows. Programming languages allow using control                  returns, but the name suggests that it contains the minimum and
structures such as if-else and loop statements. Previously                maximum xy coordinates of an axis-aligned bounding box, and
we showed LMPs can express for-loops in the form of list                  the LLM is able to infer this and generate the correct code.
comprehensions. Here we show how they can write a while-loop                 In Python, we implement hierarchical function generation
can form a simple feedback policy. Note that the prompt (same             by parsing a code block’s abstract syntax tree and checking for
as the one in B.2) does not contain such Examples:                        functions that do not exist in the given scope. We use the function-
# while the red block is to the left of the blue bowl, move it to the
                                                                          generating LMP to write these undefined functions and add them
right 5cm at a time.                                                      to the scope. This procedure is repeated on the generated function
while get_pos(’red block’)[0] < get_pos(’blue bowl’)[0]:
    target_pos = get_pos(’red block’) + [0.05, 0]
                                                                          body, hierarchically creating new functions in a depth-first manner.
    put_first_on_second(’red block’, target_pos)                          Combining control flows, LMP composition, and hierarchical
                                                                          function generation. The following example shows how LMPs
LMPs can be composed via nested function calls. This allows               can combine these capabilities to follow more complex instructions
including more few-shot examples into individual prompts to               and perform a task in the tabletop manipulation domain. Prompts
improve functional accuracy and scope, while remaining within             are omitted for brevity, but they are similar to previous ones. The
the LLM’s maximum input token length. The following (full                 high-level LMP generates high-level policy behavior and relies
prompt in B.4) generates a response that uses parse_obj, another          on parse_obj to get object names by language descriptions:
LMP that associates object names with language descriptions:
                                                                           objs = [’red block’, ’blue bowl’, ’blue block’, ’red bowl’]
objs = [’red block’, ’blue bowl’, ’blue block’, ’red bowl’]                # while there are blocks with area bigger than 0.2 that are left of the
# while the left most block is the red block, move it toward the right.    red bowl, move them toward the right.
block_name = parse_obj(’the left most block’)                              block_names = parse_obj(’blocks with area bigger than 0.2 that are
while block_name == ’red block’:                                                                    left of the red bowl’)
    target_pos = get_pos(block_name) + [0.3, 0]                            while len(block_names) > 0:
    put_first_on_second(block_name, target_pos)                                for block_name in block_names:
    block_name = parse_obj(’the left most block’)                                 target_pos = get_pos(block_name) + np.array([0.1, 0])
                                                                                  put_first_on_second(block_name, target_pos)
The parse_obj LMP (full prompt in Appendix B.5):                               block_names = parse_obj(’blocks with area bigger than 0.2 that are
                                                                                                        left of the red bowl’)
objs = [’red block’, ’blue bowl’, ’blue block’, ’red bowl’]
# the left most block.
block_names = [’red block’, ’blue block’]
                                                                          Then, parse_obj uses get_objs_bigger_than_area_th (yet-to-
block_positions = np.array([get_pos(name) for name in block_names])       be-defined function), to complete the query. This function is given
left_block_name = block_names[np.argmin(block_positions[:, 0])]
ret_val = left_block_name
                                                                          through an import statement in the Hints of the parse_obj prompt,
                                                                          but it is not implemented. Hierarchical function generation would
LMPs can hierarchically generate functions for future reuse:              subsequently create this function as demonstrated above.
 objs = [’red block’, ’blue bowl’, ’blue block’, ’red bowl’]            TABLE I: Hierarchical code-generation solves more problems in RoboCodeGen
 # blocks with area bigger than 0.2 that are left of the red bowl.      (in % pass rates) and improves with scaling laws (as # model parameters increases).
 block_names = [’red block’, ’blue block’]
 red_bowl_pos = get_pos(’red bowl’)
                                                                                                       GPT-3 [12]          Codex [1]
 use_block_names = [name for name in block_names
                    if get_pos(name)[0] < red_bowl_pos[0]]                            Method          6.7B     175B     cushman     davinci
 use_block_names = get_objs_bigger_than_area_th(use_block_names, 0.2)
 ret_val = use_block_names                                                            Flat              3       68         54          81
                                                                                      Hierarchical      5       84         57          95
We describe more on prompt engineering in the Appendix A.               TABLE II: Hierarchical code-gen performs better (% pass rate) on generic coding
                                                                        problems from HumanEval [1]. Greedy is decoding LLM with temperature=0.
                                                                        P@N evaluates correctness across N samples with temperature=0.8.
D. Language Model Programs as Policies
                                                                                                      Greedy     P@1      P@10      P@100
   In the context of robot policies, LMPs can compose perception-
to-control feedback logic given natural language instructions,                        Flat            45.7       34.9     75.1      90.9
                                                                                      Hierarchical    53.0       39.8     80.6      95.7
where the high-level outputs of perception model(s) (states)
can be programmatically manipulated and used to inform the              A. Hierarchical LMPs on Code-Generation Benchmarks
parameters of low-level control APIs (actions). Prior information           We evaluate our code-generation approach on two code-
about available perception and control APIs can be guided               generation benchmarks: (i) a robotics-themed RoboCodeGen and
through Examples and Hints. These APIs "ground" the LMPs                (ii) HumanEval [1], which consists of standard code-gen problems.
to a real-world robot system, and improvements in perception                RoboCodeGen: we introduce a new benchmark with 37 func-
and control algorithms can directly lead to improved capabilities       tion generation problems with several key differences from previ-
of LMP-based policies. For example, in real-world experiments           ous code-gen benchmarks: (i) it is robotics-themed with questions
below, we use recently developed open-vocabulary object                 on spatial reasoning (e.g., find the closest point to a set of points),
detection models like ViLD [3] and MDETR [2] off-the-shelf to           geometric reasoning (e.g., check if one bounding box is contained
obtain object positions and bounding boxes.                             in another), and controls (e.g., PD control), (ii) using third-party
   The benefits of LMP-based policies are threefold: they (i) can       libraries (e.g. NumPy) are both allowed and encouraged, (iii)
adapt policy code and parameters to new tasks and behaviors             provided function headers have no docstrings nor explicit type
specified by unseen natural language instructions, (ii) can             hints, so LLMs need to infer and use common conventions, and
generalize to new objects and environments by bootstrapping off         (iv) using not-yet-defined functions are also allowed, which can be
of open-vocabulary perception systems and/or saliency models,           created with hierarchical code-gen. Example benchmark questions
and (iii) do not require any additional data collection or model        can be found in Appendix E. We evaluate on four LLMs accessible
training. The generated plans and policies are also interpretable       from the OpenAI API1. As with standard benchmarks [1], our
as they are represented in code, allowing for easy modification         evaluation metric is the percentage of the generated code that
and reuse. Using LMPs for high-level user interactions inherits         passes human-written unit tests. See Table I. Domain-specific
the benefits of LLMs, including parsing expressive natural              language models (Codex model) generally perform better. Within
language with commonsense knowledge, taking prior context               each model family, performance improves with larger models.
into account, multilingual capabilities, and engaging in dialog.        Hierarchical performs better across the board, showing the benefit
In the experiment section that follows, we demonstrate multiple         of allowing the LLM to break down complex functions into
instantiations of LMPs across different robots and different tasks,     hierarchical parts and generate code for each part separately.
showcasing the approach’s flexible capabilities and ease of use.            We also analyze how code generation performance varies across
                                                                        the five types of generalization proposed in [23]. Hierarchical
                         IV. EXPERIMENTS                                helps Productivity the most, which is when the new instruction
                                                                        requires longer code, or code with more logic layers than those
   The goals of our experiments are threefold: (i) evaluate the         in Examples. These improvements however, only occur with the
impact of using hierarchical code generation (across different lan-     two davinci models, and not cushman, suggesting that a certain
guage models) and analyze modes of generalization, (ii) compare         level of code-generation capability needs to be reached first before
Code as Policies (CaP) against baselines in simulated language-         hierarchical code-gen can bring further improvements. More
instructed manipulation tasks, and (iii) demonstrate CaP on differ-     results are in Appendix E.2.
ent robot systems to show its flexibility and ease-of-use. Additional       Evaluations in HumanEval [1] demonstrate that hierarchical
experiments can be found in the Appendix, such as generating            code-gen improves not only policy code, but also general-purpose
reactive controllers to balance a cartpole and perform end-effector     code. See Table II. Numbers achieved are higher than in recent
impedance control (Appendix F). The Appendix also contains              works [1], [11], [58]. More details in Appendix D.
the prompt and responses for all experiments. Videos and Colab
Notebooks that reproduce these experiments can be found on the          B. CaP: Drawing Shapes via Generated Waypoints
website. Due to the difficulty of evaluating open-ended tasks and         In this domain, we task a real UR5e robot arm to draw various
a lack of comparable baselines, quantitative evaluations of a robot     shapes by generating and following a series of 2D waypoints. For
system using CaP is limited to a constrained set of simulated tasks        1 Two text models: the 6.7B GPT-3 model [12] and 175B InstructGPT [22]. Two
in IV-D, while in IV-B, IV-C, andIV-E we demonstrate the system’s       Codex models [1]: cushman and davinci, trained to generate code. davinci is
full range of supported commands without quantitative evaluations.      larger and better. Sizes of Codex models are not public.
     TABLE III: Success rates over task families with 50 trials per task.      Results are in Table III. CaP compares competitively to the
   Train/Test Task Family          CLIPort [36] NL Planner CaP (ours)       supervised CLIPort baseline on tasks with seen attributes and
                                                                            instructions, despite only few-shot prompted with one example
    SA SI     Long-Horizon            78.80          86.40         97.20
    SA SI     Spatial-Geometric       97.33           N/A          89.30    rollout for each task. With unseen task attributes, CLIPort’s
    UA SI     Long-Horizon            36.80          88.00         97.60
                                                                            performance degrades significantly, while LLM-based methods
    UA SI     Spatial-Geometric       0.00            N/A          73.33    retain similar performance. On unseen tasks and attributes, end-
    UA UI     Long-Horizon             0.00          64.00         80.00    to-end systems like CLIPort struggle to generalize, and CaP
    UA UI     Spatial-Geometric        0.01           N/A          62.00    outperforms LLM reasoning directly with language (also observed
                                                                            in [20]). Moreover, the natural-language planners [14], [16]–[18]
perception, the LMPs are given APIs that detect object positions,           are not applicable for tasks that require precise numerical spatial-
implemented with off-the-shelf open vocabulary object detector              geometric reasoning. We additionally show the benefits reasoning
MDETR [2]. For actions, an end-effector trajectory following                with code over natural language (both direct question and an-
API is provided. There are four LMPs: (i) parse user commands,              swering and Chain of Thought [47]), specifically the ability of the
maintain a session, and call action APIs, (ii) parse object names           former to perform precise numerical computations, in Appendix C.
from language descriptions, (iii) parse waypoints from language
                                                                            E. CaP: Mobile Robot Navigation and Manipulation
descriptions, and (iv) generate new functions. Examples of
successful on-robot executions of unseen language commands are                 In this domain, a robot with a mobile base and a 7 DoF arm is
in Fig. 2c. The system can elicit spatial reasoning to draw entirely        tasked to perform navigation and manipulation tasks in real-world
new shapes from language commands. Additional examples                      kitchen. For perception, the LMPs are given object detection APIs
which demonstrate the ability to parse precise dimensions,                  implemented via ViLD [3]. For actions, the robot is given APIs to
manipulate previous shapes, and multi-step commands, as well                navigate to locations and grasp objects via both names and coordi-
as full prompts, are in Appendix H.                                         nates. Examples of on-robot executions of unseen language com-
                                                                            mands are in Fig. 2. This domain shows that CaP can be deployed
C. CaP: Pick & Place Policies for Table-Top Manipulation                    across realistic tasks on different robot systems with different APIs.
   The table-top manipulation domain tasks a UR5e robot arm                 It also illustrates the ability to follow long-horizon reactive com-
to pick and place various plastic toy objects on a table. The               mands with control structures as well as precise spatial reasoning,
arm is equipped with a suction gripper and an in-hand Intel                 which cannot be easily accomplished by prior works [16], [17],
Realsense D435 camera. We provide perception APIs that detect               [36]. See prompts and additional examples in Appendix J.
the presences of objects, their positions, and bounding boxes, via                         V. DISCUSSION AND LIMITATIONS
MDETR [2]. We also provide a scripted primitive that picks an                  CaP generalizes at a specific layer in the robot stack:
object and places it on a target position. Prompts are similar to           interpreting natural language instructions, processing perception
those from the last domain, except trajectory parsing is replaced           outputs, then parameterizing low-dimensional inputs to control
with position parsing. Examples of on-robot executions of unseen            primitives. This fits into systems with factorized perception
language commands are in Fig. 2 panels a and b, showing                     and control, and it imparts a degree of generalization (acquired
the capacity to reason about object descriptions and spatial                from pretrained LLMs) without the magnitude of data collection
relationships. Other commands that use historical context (e.g.,            needed for end-to-end learning. Our method also inherits LLM
"undo that"), reason about objects via geometric (e.g., "smallest")         capabilities unrelated to code writing e.g., supporting instructions
and spatial (e.g., "right-most") descriptions are in Appendix I.            with non-English languages or emojis (Appendix L. CaP can
                                                                            also express cross-embodied plans that perform the same task
D. CaP: Table-Top Manipulation Simulation Evaluations
                                                                            differently depending on the available APIs (Appendix M).
    We evaluate CaP on a simulated table-top manipulation                   However, this ability is brittle with existing LLMs, and it may
environment from [16], [18]. The setup tasks a UR5e arm and                 require larger ones trained on domain-specific code.
Robotiq 2F85 gripper to manipulate 10 colored blocks and 10                    CaP today are restricted by the scope of (i) what the perception
colored bowls. We inherit all 8 tasks, referred as "long-horizon"           APIs can describe (e.g., no visual-language models to date can
tasks due to their multi-step nature (e.g., "put the blocks in              describe whether a trajectory is "bumpy" or "more C-shaped"),
matching bowls"). We define 6 new tasks that require more                   and (ii) which control primitives are available. Only a handful
challenging and precise spatial-geometric reasoning capabilities            of named primitive parameters can be adjusted without over-
(e.g., "place the blocks in a diagonal line"). Each task is                 saturating the prompts. CaP also struggle to interpret commands
parameterized by some attributes (e.g., "pick up <obj> and place            that are significantly longer or more complex, or operate at a
it in <corner>"), which are sampled during each trial. We split the         different abstraction level than the given Examples. In the tabletop
task instructions (I) and the attributes (A) into "seen" (SI, SA) and       domain, it would be difficult for LMPs to "build a house with the
"unseen" categories (UI, UA), where "seen" means it’s allowed to            blocks," since there are no Examples on building complex 3D
appear in the prompts or be trained on (in the case of supervised           structures. Our approach also assumes all given instructions are
baseline). More details in Appendix K. We consider two baselines:           feasible, and we cannot tell if a response will be correct a priori.
(i) language-conditioned multi-task CLIPort [36] policies trained                                 ACKNOWLEDGEMENTS
via imitation learning on 30k demonstrations, and (ii) few-shot                Special thanks to Vikas Sindhwani, Vincent Vanhoucke for helpful feedback on
prompted LLM planner using natural language instead of code.                writing, Chad Boodoo for operations and hardware support.
                                REFERENCES                                            [29] S. Tellex, T. Kollar, S. Dickerson, M. Walter, A. Banerjee, S. Teller, and
                                                                                           N. Roy, “Understanding natural language commands for robotic navigation
 [1] M. Chen, J. Tworek, H. Jun, Q. Yuan, H. P. d. O. Pinto, J. Kaplan,
                                                                                           and mobile manipulation,” in AAAI, 2011.
     H. Edwards, Y. Burda, N. Joseph, G. Brockman et al., “Evaluating large
                                                                                      [30] D. Shah, B. Osinski, B. Ichter, and S. Levine, “Lm-nav: Robotic
     language models trained on code,” arXiv:2107.03374, 2021.
                                                                                           navigation with large pre-trained models of language, vision, and action,”
 [2] A. Kamath, M. Singh, Y. LeCun, G. Synnaeve, I. Misra, and N. Carion,
                                                                                           arXiv:2207.04429, 2022.
     “Mdetr-modulated detection for end-to-end multi-modal understanding,” in
                                                                                      [31] C. Matuszek, E. Herbst, L. Zettlemoyer, and D. Fox, “Learning to parse
     ICCV, 2021.
                                                                                           natural language commands to a robot control system,” in Experimental
 [3] X. Gu, T.-Y. Lin, W. Kuo, and Y. Cui, “Open-vocabulary object detection
                                                                                           robotics, 2013.
     via vision and language knowledge distillation,” arXiv:2104.13921, 2021.
                                                                                      [32] J. Thomason, A. Padmakumar, J. Sinapov, N. Walker, Y. Jiang, H. Yedidsion,
 [4] S. Tellex, N. Gopalan, H. Kress-Gazit, and C. Matuszek, “Robots that use
                                                                                           J. Hart, P. Stone, and R. Mooney, “Jointly improving parsing and perception
     language,” Review of Control, Robotics, and Autonomous Systems, 2020.
                                                                                           for natural language commands through human-robot dialog,” JAIR, 2020.
 [5] T. Winograd, “Procedures as a representation for data in a computer program
                                                                                      [33] S. Nair, E. Mitchell, K. Chen, S. Savarese, C. Finn et al., “Learning
     for understanding natural language,” MIT PROJECT MAC, 1971.
                                                                                           language-conditioned robot behavior from offline data and crowd-sourced
 [6] J. Dzifcak, M. Scheutz, C. Baral, and P. Schermerhorn, “What to do and how
                                                                                           annotation,” in CoRL, 2022.
     to do it: Translating natural language directives into temporal and dynamic
                                                                                      [34] J. Andreas, D. Klein, and S. Levine, “Learning with latent language,”
     logic representation for goal management and action execution,” in ICRA,
                                                                                           arXiv:1711.00482, 2017.
     2009.
                                                                                      [35] P. Sharma, B. Sundaralingam, V. Blukis, C. Paxton, T. Hermans, A. Torralba,
 [7] Y. Artzi and L. Zettlemoyer, “Weakly supervised learning of semantic
                                                                                           J. Andreas, and D. Fox, “Correcting robot plans with natural language
     parsers for mapping instructions to actions,” TACL, 2013.
                                                                                           feedback,” arXiv:2204.05186, 2022.
 [8] C. Lynch and P. Sermanet, “Language conditioned imitation learning over
                                                                                      [36] M. Shridhar, L. Manuelli, and D. Fox, “Cliport: What and where pathways
     unstructured data,” arXiv:2005.07648, 2020.
                                                                                           for robotic manipulation,” in CoRL, 2021.
 [9] E. Jang, A. Irpan, M. Khansari, D. Kappler, F. Ebert, C. Lynch, S. Levine,
                                                                                      [37] S. Stepputtis, J. Campbell, M. Phielipp, S. Lee, C. Baral, and H. Ben Amor,
     and C. Finn, “Bc-z: Zero-shot task generalization with robotic imitation
                                                                                           “Language-conditioned imitation learning for robot manipulation tasks,”
     learning,” in CoRL, 2022.
                                                                                           NeurIPS, 2020.
[10] O. Mees, L. Hermann, E. Rosete-Beas, and W. Burgard, “Calvin: A
                                                                                      [38] Y. Jiang, S. S. Gu, K. P. Murphy, and C. Finn, “Language as an abstraction
     benchmark for language-conditioned policy learning for long-horizon robot
                                                                                           for hierarchical deep reinforcement learning,” NeurIPS, 2019.
     manipulation tasks,” RA-L, 2022.
                                                                                      [39] P. Goyal, S. Niekum, and R. J. Mooney, “Pixl2r: Guiding reinforcement
[11] A. Chowdhery, S. Narang, J. Devlin, M. Bosma, G. Mishra, A. Roberts,
                                                                                           learning using natural language by mapping pixels to rewards,”
     P. Barham, H. W. Chung, C. Sutton, S. Gehrmann et al., “Palm: Scaling
                                                                                           arXiv:2007.15543, 2020.
     language modeling with pathways,” arXiv:2204.02311, 2022.
                                                                                      [40] G. Cideron, M. Seurin, F. Strub, and O. Pietquin, “Self-educated language
[12] T. Brown, B. Mann, N. Ryder, M. Subbiah, J. D. Kaplan, P. Dhariwal,
                                                                                           agent with hindsight experience replay for instruction following,” DeepMind,
     A. Neelakantan, P. Shyam, G. Sastry, A. Askell et al., “Language models
                                                                                           2019.
     are few-shot learners,” NeurIPS, 2020.
                                                                                      [41] D. Misra, J. Langford, and Y. Artzi, “Mapping instructions and visual obser-
[13] S. Zhang, S. Roller, N. Goyal, M. Artetxe, M. Chen, S. Chen, C. Dewan,
                                                                                           vations to actions with reinforcement learning,” arXiv:1704.08795, 2017.
     M. Diab, X. Li, X. V. Lin et al., “Opt: Open pre-trained transformer language
                                                                                      [42] A. Akakzia, C. Colas, P.-Y. Oudeyer, M. Chetouani, and O. Sigaud,
     models,” arXiv:2205.01068, 2022.
                                                                                           “Grounding language to autonomously-acquired skills via goal generation,”
[14] W. Huang, P. Abbeel, D. Pathak, and I. Mordatch, “Language models as
                                                                                           arXiv:2006.07185, 2020.
     zero-shot planners: Extracting actionable knowledge for embodied agents,”
                                                                                      [43] I. Drori, S. Zhang, R. Shuttleworth, L. Tang, A. Lu, E. Ke, K. Liu, L. Chen,
     arXiv:2201.07207, 2022.
                                                                                           S. Tran, N. Cheng et al., “A neural network solves, explains, and generates
[15] T. Kojima, S. S. Gu, M. Reid, Y. Matsuo, and Y. Iwasawa, “Large language
                                                                                           university math problems by program synthesis and few-shot learning at
     models are zero-shot reasoners,” arXiv:2205.11916, 2022.
                                                                                           human level,” PNAS, 2022.
[16] A. Zeng, A. Wong, S. Welker, K. Choromanski, F. Tombari, A. Purohit,
                                                                                      [44] A. Lewkowycz, A. Andreassen, D. Dohan, E. Dyer, H. Michalewski, V. Ra-
     M. Ryoo, V. Sindhwani, J. Lee, V. Vanhoucke et al., “Socratic
                                                                                           masesh, A. Slone, C. Anil, I. Schlag, T. Gutman-Solo et al., “Solving quan-
     models: Composing zero-shot multimodal reasoning with language,”
                                                                                           titative reasoning problems with language models,” arXiv:2206.14858, 2022.
     arXiv:2204.00598, 2022.
                                                                                      [45] K. Cobbe, V. Kosaraju, M. Bavarian, J. Hilton, R. Nakano, C. Hesse,
[17] M. Ahn, A. Brohan, N. Brown, Y. Chebotar, O. Cortes, B. David, C. Finn,
                                                                                           and J. Schulman, “Training verifiers to solve math word problems,”
     K. Gopalakrishnan, K. Hausman, A. Herzog et al., “Do as i can, not as i
                                                                                           arXiv:2110.14168, 2021.
     say: Grounding language in robotic affordances,” arXiv:2204.01691, 2022.
                                                                                      [46] D. Zhou, N. Schärli, L. Hou, J. Wei, N. Scales, X. Wang, D. Schuurmans,
[18] W. Huang, F. Xia, T. Xiao, H. Chan, J. Liang, P. Florence, A. Zeng, J. Tomp-
                                                                                           O. Bousquet, Q. Le, and E. Chi, “Least-to-most prompting enables complex
     son, I. Mordatch, Y. Chebotar, P. Sermanet, N. Brown, T. Jackson, L. Luu,
                                                                                           reasoning in large language models,” arXiv:2205.10625, 2022.
     S. Levine, K. Hausman, and B. Ichter, “Inner monologue: Embodied reason-
                                                                                      [47] J. Wei, X. Wang, D. Schuurmans, M. Bosma, B. Ichter, F. Xia, E. Chi,
     ing through planning with language models,” in arXiv:2207.05608, 2022.
                                                                                           Q. Le, and D. Zhou, “Chain of thought prompting elicits reasoning in large
[19] P. Florence, C. Lynch, A. Zeng, O. A. Ramirez, A. Wahid, L. Downs,
                                                                                           language models,” arXiv:2201.11903, 2022.
     A. Wong, J. Lee, I. Mordatch, and J. Tompson, “Implicit behavioral cloning,”
                                                                                      [48] J. Austin, A. Odena, M. Nye, M. Bosma, H. Michalewski, D. Dohan,
     in CoRL, 2022.
                                                                                           E. Jiang, C. Cai, M. Terry, Q. Le et al., “Program synthesis with large
[20] A. Zeng, “Learning visual affordances for robotic manipulation,” Ph.D.
                                                                                           language models,” arXiv:2108.07732, 2021.
     dissertation, Princeton University, 2019.
                                                                                      [49] K. Ellis, C. Wong, M. Nye, M. Sable-Meyer, L. Cary, L. Morales,
[21] D. Kalashnikov, A. Irpan, P. Pastor, J. Ibarz, A. Herzog, E. Jang, D. Quillen,
                                                                                           L. Hewitt, A. Solar-Lezama, and J. B. Tenenbaum, “Dreamcoder: Growing
     E. Holly, M. Kalakrishnan, V. Vanhoucke et al., “Scalable deep reinforcement
                                                                                           generalizable, interpretable knowledge with wake-sleep bayesian program
     learning for vision-based robotic manipulation,” in CoRL, 2018.
                                                                                           learning,” arXiv:2006.08381, 2020.
[22] L. Ouyang, J. Wu, X. Jiang, D. Almeida, C. L. Wainwright, P. Mishkin,
                                                                                      [50] L. Tian, K. Ellis, M. Kryven, and J. Tenenbaum, “Learning abstract structure
     C. Zhang, S. Agarwal, K. Slama, A. Ray et al., “Training language models
                                                                                           for drawing by efficient motor program induction,” NeurIPS, 2020.
     to follow instructions with human feedback,” arXiv:2203.02155, 2022.
                                                                                      [51] D. Trivedi, J. Zhang, S.-H. Sun, and J. J. Lim, “Learning to synthesize
[23] D. Hupkes, V. Dankers, M. Mul, and E. Bruni, “Compositionality
                                                                                           programs as interpretable and generalizable policies,” NeurIPS, 2021.
     decomposed: How do neural networks generalise?” JAIR, 2020.
                                                                                      [52] O. Mees and W. Burgard, “Composing pick-and-place tasks by grounding
[24] C. Breazeal, K. Dautenhahn, and T. Kanda, “Social robotics,” Springer
                                                                                           language,” in ISER, 2020.
     handbook of robotics, 2016.
                                                                                      [53] W. Liu, C. Paxton, T. Hermans, and D. Fox, “Structformer: Learning spatial
[25] T. Kollar, S. Tellex, D. Roy, and N. Roy, “Toward understanding natural
                                                                                           structure for language-guided semantic rearrangement of novel objects,” in
     language directions,” in HRI, 2010.
                                                                                           ICRA, 2022.
[26] J. Luketina, N. Nardelli, G. Farquhar, J. N. Foerster, J. Andreas,
                                                                                      [54] W. Yuan, C. Paxton, K. Desingh, and D. Fox, “Sornet: Spatial object-centric
     E. Grefenstette, S. Whiteson, and T. Rocktäschel, “A survey of reinforcement
                                                                                           representations for sequential manipulation,” in CoRL, 2022.
     learning informed by natural language,” in IJCAI, 2019.
                                                                                      [55] A. Bucker, L. Figueredo, S. Haddadin, A. Kapoor, S. Ma, and R. Bonatti,
[27] M. MacMahon, B. Stankiewicz, and B. Kuipers, “Walk the talk: Connecting
                                                                                           “Reshaping robot trajectories using natural language commands: A study
     language, knowledge, and action in route instructions,” AAAI, 2006.
[28] J. Thomason, S. Zhang, R. J. Mooney, and P. Stone, “Learning to interpret             of multi-modal data alignment using transformers,” arXiv:2203.13411, 2022.
     natural language commands through human-robot dialog,” in IJCAI, 2015.
[56] A. Bobu, C. Paxton, W. Yang, B. Sundaralingam, Y.-W. Chao, M. Cakmak,        evaluation of large language models of code,” in MAPS, 2022.
     and D. Fox, “Learning perceptual concepts by bootstrapping from human   [59] K. Zakka, A. Zeng, P. Florence, J. Tompson, J. Bohg, and D. Dwibedi, “Xirl:
     queries,” RA-L, 2022.                                                        Cross-embodiment inverse reinforcement learning,” in CoRL. PMLR, 2022.
[57] J. Wu, L. Ouyang, D. M. Ziegler, N. Stiennon, R. Lowe, J. Leike, and    [60] A. Ganapathi, P. Florence, J. Varley, K. Burns, K. Goldberg, and A. Zeng,
     P. Christiano, “Recursively summarizing books with human feedback,”          “Implicit kinematic policies: Unifying joint and cartesian action spaces in
     arXiv:2109.10862, 2021.                                                      end-to-end robot learning,” arXiv:2203.01983, 2022.
[58] F. F. Xu, U. Alon, G. Neubig, and V. J. Hellendoorn, “A systematic
                                                                         objs = [’green block’, ’green bowl’, ’yellow block’, ’yellow bowl’]
                            APPENDIX                                     # the yellow block.
A. Prompt Engineering                                                    ret_val = ’yellow block’
                                                                         # the blocks.
   Using LMPs to reliably complete tasks via code generation             ret_val = [’green block’, ’yellow block’]
requires careful prompt engineering. While these prompts do
                                                                           2) First-party: Full prompt:
not have to be long, they do need to be relevant and specific.
Here, we discuss a few general guidelines that we followed while         from utils import get_pos, put_first_on_second
                                                                         objs = [’gray block’, ’gray bowl’]
developing prompts for this paper.                                       # put the gray block on the gray bowl.
   It is very important for prompts to contain code that has no bugs.    put_first_on_second(’gray block’, ’gray bowl’)
                                                                         objs = [’purple block’, ’purple bowl’]
Bugs in the prompt lead to unreliable and incorrect responses. Con-      # move the purple bowl toward the left.
versely, if the LMP is writing incorrect code for a given Instruction,   target_pos = get_pos(’purple bowl’) + [-0.3, 0]
                                                                         put_first_on_second(’purple bowl’, target_pos)
the prompt engineer should first verify that the prompt, especially
the Examples most closely related to the Instruction, is bug-free.          3) Combining language reasoning, third-party, and first-party
To reduce bugs related to syntax errors, one simple method is            libraries.: Full prompt:
writing prompts in a code editor with syntax highlighting.
                                                                         import numpy as np
   There are many cases where the prompt contains variables              from utils import get_pos, put_first_on_second
or functions whose names are ambiguous. To produce reliable              objs = [’cyan block’, ’cyan bowl’, ’pink bowl’]
                                                                         # put the cyan block in cyan bowl.
responses under these conditions, Examples in the prompt should          put_first_on_second(’cyan block’, ’cyan bowl’)
treat these ambiguities consistently. If a variable named point          objs = [’gray block’, ’silver block’, ’gray bowl’]
                                                                         # place the top most block on the gray bowl.
is treated as an numpy.ndarray object in one Example and as              names = [’gray block’, ’silver block’]
a shapely.geometry.Point object in another, the LMP will not             positions = np.array([get_pos(name) for name in names])
                                                                         name = names[np.argmax(positions[:,1])]
be able to “decide" on which convention to use, resulting in             put_first_on_second(name, ’gray bowl’)
unreliable responses. Another way to handle ambiguity is by              objs = [’purple block’, ’purple bowl’]
                                                                         # put the purple bowl to the left of the purple block.
providing informal type hints, such as appending _np to variable         target_pos = get_pos(’purple block’) + [-0.3, 0]
names to indicate its type, or appending it to function names to         put_first_on_second(’purple bowl’, target_pos)
indicate the type of the returned variable. In general, more specific
variable and function names give more consistent results.                  4) LMPs can be composed.: Full prompt:
   For using third party libraries, including import statements
                                                                         import numpy as np
in the prompt may not be necessary, as we found that LMPs                from utils import get_pos, put_first_on_second, parse_obj
can generate code that calls NumPy and SciPy without them.               objs = [’yellow block’, ’yellow bowl’, ’gray block’, ’gray bowl’]
                                                                         # move the sun colored block toward the left.
However, explicit import statements do improve reliability and           block_name = parse_obj(’sun colored block’)
increase the chance of LMPs using those libraries when the need          target_pos = get_pos(block_name) + [-0.3, 0]
                                                                         put_first_on_second(block_name, target_pos)
arises. For using first party libraries, meaningful function names       objs = [’white block’, ’white bowl’, ’yellow block’, ’yellow bowl’]
that follow popular conventions (e.g., begin with set_ and get_)         # place the block closest to the blue bowl on the other bowl.
                                                                         block_name = parse_obj(’the block closest to the blue bowl’)
and specify return object formats (e.g., get_bbox_xyxy) induce           bowl_name = parse_obj(’a bowl other than the blue bowl’)
more accurate usages. Import statements in the Hints should              put_first_on_second(block_name, bowl_name)
be formatted as if we were importing functions. For example,
                                                                           5) parse_obj prompt.: Full prompt:
in Python this means using from utils import function_name
instead of import function_name. If the latter is used, the LMP          import numpy as np
may treat the imported name as a package, and the generated code         from utils import get_pos
                                                                         objs = [’brown bowl’, ’green block’, ’brown block’, ’green bowl’]
might write function_name.function_name().                               # the blocks.
   One type of LMP failures are related to code generation               ret_val = [’brown block’, ’green block’]
                                                                         # the sky colored block.
correctness. For example, minor coding mistakes when calling             ret_val = ’blue block’
internal or external APIs, such as missing arguments, can be             objs = [’orange block’, ’cyan block’, ’purple bowl’, ’gray bowl’]
                                                                         # the right most block.
fixed with an Hint or Example demonstrating the correct usage.           block_names = [’orange block’, ’cyan block’]
Incorrect assumptions on variable types can also be fixed in             block_positions = np.array([
                                                                                          get_pos(block_name) for block_name in block_names])
similar fashions. Other coding failures may be addressed by              right_block_name = block_names[np.argmax(block_positions[:, 0])]
descriptive function names to encourage appropriate library              ret_val = right_block_name

usage (perform_function_with_np()) or succinct code logic (#             C. Reasoning with Code vs. Natural Language
implement in one line.) While it is possible to use LLMs to
edit code and fix bugs (e.g., by using OpenAI’s code edit API), in          To investigate how robot-relevant reasoning through LLMs can
our experience this yielded inconsistent results (not always able to     be performed with LMPs rather than with natural language, we
correct mistakes, and sometimes changed what the function was            created a benchmark that consists of two sets of tasks: (i) selecting
doing), so we did not employ this method in our experiments.             objects in a scene from spatial-geometric descriptions, and (ii)
                                                                         selecting position coordinates from spatial-geometric descriptions.
B. Method Section Prompts                                                Object selection has 28 questions with commands such as "find the
  1) Language-based reasoning: Full prompt:                              name of the block closest to the blue bowl," where a list of block
                                                                         and bowl positions are provided as input context in the prompt.
                                                                                   def get_total(xs: List[float]) -> float:
Position selection has 23 questions with commands such as                             """Find the sum of a list of numbers called xs.
"interpolate 3 points on a line from the cyan bowl to the blue bowl."                 """
                                                                                      return sum(xs)
An LLM-generated answer for position selection is considered                       # end of function
correct if all coordinates are within 1cm of the ground truth.
                                                                                   def get_abs_diff_between_means(xs0: List[float],
   We evaluate LMPs against two variants of reasoning with                                                        xs1: List[float]) -> float:
natural language: (i) Vanilla, given a description of the setting                     """Get the absolute difference between the means of two lists of
                                                                                      numbers.
(e.g., list of object positions) and the question, directly outputs                   """
the answer (e.g., "Q: What is the top-most block?" → "A: red                          m0 = get_mean(xs0)
                                                                                      m1 = get_mean(xs1)
block"), and (ii) Chain of Thought (CoT) [47], which performs                         return abs(m0 - m1)
step-by-step reasoning given examples of intermediate steps in                     # end of function
the prompt (e.g., encouraging the LLM to list out y-coordinates
                                                                                     Note the only difference in the hierarchical prompt is using a
of all blocks in the scene before identifying the top-most block).
                                                                                  yet-to-be-defined function get_mean instead of calculating the
TABLE IV: Using code for spatial-geometric reasoning yields higher success rate
                                                                                  mean directly. This "allows" the LLM to generate code that also
(mean %) than using vanilla natural language or chain-of-thought prompting.       call yet-to-be-defined functions.
                                                                                     We report pass rates for when using the most likely outputs
                                Natural Language          Code                    ("greedy", which is done by setting temperature to 0), as well as
           Tasks                Vanilla   CoT [47]     LMP (ours)                 pass rates for at least one solution from sampling various numbers
           Object Selection       39          68            96                    of solutions (1, 10, and 100) with temperature set to 0.8, similar
           Position Selection     30          48           100                    to those used in prior works [1], [11], [58].
           Total                  35          58            98

                                                                                  TABLE V: Hierarchical code generation also performs better (in % pass rates)
   Results in Table IV show that LMPs achieve accuracies in the                   on generic coding problems from the standard HumanEval benchmark [1]. For
                                                                                  columns, Greedy means decoding LLM with temperature=0, while P@N means
high 90s, outperforming CoT, which outperforms Vanilla. CoT                       evaluating correctness across N samples decoded from LLM with temperature=0.8.
enables LLMs to reason about relations and orders (e.g. which
coordinate is to the right of another coordinate), but failures occur                                                  Greedy     P@1     P@10     P@100
for precise and multi-step numerical computations. By contrast,                        code-davinci-001 [11]           -          36.0    -        81.7
code from LMPs can use Python to perform such computations,                            PaLM Coder [11]                 -          36.0    -        88.4
and they often leverage external libraries to perform more complex                     Flat CodeGen + No Prompt        45.7       34.9    75.1     90.9
operations (e.g., NumPy for vector addition). CoT and LMPs are                         Flat CodeGen + Flat Prompts     50.6       36.6    77.6     93.3
                                                                                       Hier. CodeGen + Hier Prompts    53.0       39.8    80.6     95.7
not mutually exclusive – it is possible to prompt "step-by-step"
code-generation to solve more complex tasks via CoT, but this
is a direction not explored in this work.                                            See results in Table II. In all instances hierarchical code
                                                                                  generation outperforms flat code generation, and the numbers
D. CodeGen HumanEval Additional Results                                           achieved are higher than those reported in recent works [1],
   Here we provide additional results to our HumanEval experi-                    [11], [58] Note that we use code-davinci-002, while previous
ments. In total, three variants of the bigger Codex model (code-                  works use code-davinci-001, but the relative improvements
davinci-002) are tested. Our approach is Hier. CodeGen + Hier                     with hierarchical are consistent across the board. Out of the 164
Prompts, where the prompt encourages the LLM to call yet-to-be-                   questions in HumanEval, 6.5% led to hierarchical code generation,
defined functions by including such examples. For comparisons,                    but of which both Flat CodeGen variants got 44% success, while
we evaluate against Flat CodeGen + No Prompt, essentially just                    Hier CodeGen code got 56%. While success rate when sampling
using the LLM directly, and Flat CodeGen + Flat Prompt, for fair                  100 responses is above 90% across the board, we note that
comparison with flat code-generation, since our hierarchical ap-                  sampling multiple solutions is not practical for LMPs, which need
proach has a prompt. The prompts only contain only 2 Examples:                    to perform tasks in a zero-shot manner without engineering prior
   Prompt for Flat CodeGen:                                                       unit tests. As such, for LMPs we always set temperature to 0 and
                                                                                  use the most likely output.
 prompt_f_gen_flat = ”’
 def get_total(xs: List[float]) -> float:
    """Find the sum of a list of numbers called xs.
                                                                                  E. Robot Code-Generation Benchmark
    """
    return sum(xs)
                                                                                    1) Example Questions: Here are four types of benchmark
 # end of function                                                                questions and their examples:
 def get_abs_diff_between_means(xs0: List[float],                                 • Vector operations with Numpy:
                                xs1: List[float]) -> float:                           pts = interpolate_pts_np(start, end, n)
    """Get the absolute difference between the means of two
    lists of numbers.                                                             •   Simple controls:
    m0 = sum(xs0) / len(xs0)                                                          u = pd_control(x_curr, x_goal, x_dot, Kp, Kv)
    m1 = sum(xs1) / len(xs1)
    return abs(m0 - m1) # end of function                                         •   Manipulating shapes with shapely:
                                                                                      circle = make_circle(radius, center)
   Prompt for Hierarchical CodeGen:                                               •   Using first-party libraries:
                                                                                      ret_val = obj_shape_does_not_contain_others(obj_name,
                                                                                      other_obj_names)
                                                                       that solving a problem in the benchmark demonstrates a particular
                                                                       type of generalization if the problem’s instruction or solution
                                                                       satisfy the following conditions:
                                                                          • Systematicity: recompose parts of Examples’ instructions
                                                                             or code snippets.
                                                                          • Productivity: have longer code or contains more levels (e.g.,
                                                                             hierarchical function calls) than Examples.
                                                                          • Substitutivity: use synonyms or replace words of similar
                                                                             categories from Examples.
                                                                          • Localism: reuse seen parts or concepts for different purposes.
                                                                          • Overgeneralization: use new API calls or programming
                                                                             language features not seen in Examples.
                                                                          In Figure 4 we report results across three models. The top
                                                                       plot shows using flat prompts and flat code generation, while the
                                                                       bottom uses hierarchical prompts and hierarchical code generation.
                                                                       The relative rankings of the three models are consistent across
                                                                       all generalization types, with code-davinci-002 performing the
                                                                       best. The smallest model, code-cushman-001, performs especially
                                                                       poorly in Productivity and Localism, but it performs much better
                                                                       on Substitutivity. Indeed, the high Substitutivity performance
                                                                       across all models may indicate that language models are
                                                                       particularly robust to replacing words that have similar meanings or
                                                                       are from similar categories, while generalization to more complex
                                                                       commands (longer answers via Productivity or maintaining local
                                                                       structures via Localism) are more challenging. Hierarchical code
                                                                       generation also brings significant performance improvements for
                                                                       both davinci models, especially on Productivity, allowing these
                                                                       models to write longer and more multi-layered functions. However,
                                                                       these improvements are not apparent for cushman, which actually
                                                                       has lower Substitutivity and Localism success rates, suggesting
                                                                       reaching a certain code-generation capability level is needed before
                                                                       Hierarchical Code-Generation can bring further improvements.
                                                                       F. CaP: Reactive Controllers for Toy Tasks
                                                                          LMPs can express reactive controllers, and we demonstrate this
                                                                       on: (i) OpenAI Gym’s CartPole balancing and (ii) end-effector
                                                                       position impedance control. Using the same prompt structure, both
                                                                       controllers can be generated zero-shot, reflecting the knowledge
                                                                       already stored in the language model, which can be invoked when
                                                                       the objective is sufficiently specified in the function signature:
                                                                       # define function: direction = keep_pole_upright_with_pd_control(x,
                                                                       x_dot, theta, theta_dot).
Fig. 4: Robot Code-Generation Benchmark Performance across             # info: direction is 1 if going right, 0 if going left.
                                                                       def keep_pole_upright_with_pd_control(x, x_dot, theta, theta_dot):
Generalization Types for Flat (top) and Hierarchical (middle) Code-       # define constants.
Generation, as well as the performance improvements made by               kp = 1
                                                                          kd = 1
Hierarchical Code-Generation (bottom).                                    # define direction.
                                                                          direction = 1
                                                                          # define error.
                                                                          error = theta
For the last type, we provide imports of first-party functions, like      # define error_dot.
                                                                          error_dot = theta_dot
ones that get object geometric information by name, as Hints in           # define control.
the prompt.                                                               control = kp * error + kd * error_dot
                                                                          # define direction.
   2) Generalization Analysis: We analyze how well code-                  if control < 0:
generation performs across the fives types of generalizations                 direction = 0
                                                                          return direction
described in [23], where generalization is evaluated by comparing
the examples given in the prompt with the new instructions given       The generated LMP expresses a controller that takes as input the
in the benchmark. We give a description of the five types of           position of the cart, angle of the pole, and their velocities, then
generalization applied to our benchmark. Specifically, we say          it balances the pole by actuating the cart below with discrete left
or right actions. This controller is only a simple one that requires    3D coordinates for both perception and action (e.g., scripted
initialization to be near upright, but it can stabilize an unstable     picking primitives), we deproject the corresponding pixels from
fixed point.                                                            a depth camera, whose transform to the robot frame is registered
                                                                        a priori. The robustness of today’s vision language models
                                                                        could still be improved, and many real-world failures could be
                                                                        attributed to inaccurate detections. In addition, a degree of prompt
                                                                        engineering is also required for VLMs. For example, MDETR
                                                                        detects blocks more reliably with the word “square" than "block,"
                                                                        and applying our approach to a new domain will require some
                                                                        prompt engineering for the vision language model.
                                                                        H. Whiteboard Drawing
                                                                           In this domain, a UR5e robot is tasked to draw and erase
                                                                        various shapes described by natural language on a whiteboard.
                                                                        A dry-erase marker is rigidly attached to the robot end-effector.
                    Fig. 5: LMPs can balance a cartpole                 The whiteboard dimensions, location, and the location of the
                                                                        eraser are known. Additional objects may be added to the scene
  LMPs can likewise be prompted to express impedance control:           for the commands to refer to (e.g., draw a circle around the blue
 # define function: tau = ee_impedance_control(x_curr, x_goal,          block). In our demos, we use Google Cloud’s speech-to-text and
                            x_dot, K_x_mat, D_x_mat, J).                text-to-speech APIs to allow users interact with the system through
 def ee_impedance_control(x_curr, x_goal, x_dot, K_x_mat,
                            D_x_mat, J):                                voice commands and also hear the robot’s responses to commands.
    x_err = x_goal - x_curr                                                Prompts.
    x_dot_err = -x_dot
    tau = np.matmul(J.T,                                                   • draw_ui: the high-level
           np.matmul(K_x_mat, x_err) + np.matmul(D_x_mat, x_dot_err))
    return tau                                                                UI for parsing user commands and calling other functions
                                                                              https://code-as-policies.github.io/prompts/draw_ui.txt
to move a robot arm end-effector towards a goal position with joint        • parse_obj_name:
torques. The controller is functional in that it can control a UR5e           return names of objects from natural language descriptions
robot in PyBullet, but simplified in that it does not compensate              https://code-
for Coriolis or gravity forces. Note the need to include extra                as-policies.github.io/prompts/parse_obj_name.txt
information about the expected direction output as well as the hint        • parse_shape_pts: return sequence of
to use PD control in the function signature. Without these hints,             2D waypoints of shapes from natural language descriptions
the resultant function may still look reasonable (e.g. it may output          https://code-
continuous values for control instead of discrete), but it will not           as-policies.github.io/prompts/parse_shape_pts.txt
work for this specific environment API. For the names of the input         • transform_shape_pts: performs 2D transforms on
gains, _mat was needed for the LMP to treat them as matrices                  a sequence of 2D points from natural language descriptions
instead of scalars, and _x was needed to indicate these gains were            https://code-
for the end-effector, not the joints. We demonstrate the use of               as-policies.github.io/prompts/transform_shape_pts.txt
this controller by commanding the end-effector 3D positions of             • function_generation: define functions from comments
a UR5e robot in PyBullet. The default PD gains of 1 also work in              https://code-as-policies.github.io/prompts/fgen_simple.txt
this domain without additional tuning as the CartPole environment          APIs.
is relatively simple. More complex continuous control tasks may
                                                                           • get_obj_names() - gets list of available objects in the scene.
require actually tuning the gains based on execution feedback,
                                                                              these are prespecified.
something our method does not support at the moment.
                                                                           • get_obj_pos(name) - get the 2D position of the center of an
   Both examples show it is possible to generate simple reactive
controllers, but more work is needed to express more complex                  object by name.
                                                                           • draw(pts_2d) - draws a shape by commanding the robot
ones.
                                                                              end-effector to follow a squence of points on the whiteboard.
G. Visual Language Models                                                     The robot first moves to a point above the first point in the
   For real-world experiments, we use off-the-shelf open-                     trajectory, moves down to until contact with the whiteboard
vocabulary object detection models, ViLD [3] and MDETR [2]                    is detected, and proceeds to follow the rest of the trajectory.
to perform object detection, localization, and segmentation. These         • erase(pts_2d) - erases a shape by commanding the robot
are called visual language models because they take as input a                end-effector to first establish contact with a eraser (eraser
natural language description (caption) of the image and try to                position is hardcoded) before following the the rest of the
find objects in that description. ViLD is used for the mobile robot           trajectory.
domain, while MDETR is used for the tabletop manipulation and              Instructions. These instructions were given to the robot
whiteboard drawing domains. Both models give an axis-aligned            in series from an initial blank whiteboard. See full video and
bounding box in the image along with per-pixel segmentation             generated code on the website.
masks of the detected objects. To convert these detections to
 1) draw a 5cm hexagon around the middle                                  • get_color_rgb(name)       - gets the average RGB color of an
 2) draw a line that bisects the hexagon                                    object detection crop by name.
 3) make them both bigger                                                 • get_corner_name(pos_2d) - gets the name of the corner
 4) erase the hexagon and the line                                          (e.g., top right corner) closest to the 2d point.
 5) draw the sun as a circle at the top right                             • get_side_name(pos_2d) - gets the name of the side (e.g.,
 6) draw the ground as a line at the bottom                                 left side) closest to the 2d point.
 7) draw a pyramid as a triangle on the ground                            • denormalize_xy(normalized_pos_2d)            - converts a
 8) draw a smaller pyramid a little bit to the left                         normalized 2D coordinate (each value between 0
 9) draw circles around the blocks                                          and 1) to an actual 2D coordinate in robot frame.
10) draw a square around the sweeter fruit                                • put_first_on_second(obj_name, target) - picks the first
                                                                            object by name and places it on top of the target by name. The
I. Real-World Tabletop Manipulation
                                                                            target could be another object name or a 2D position. Picking
   In this domain, a UR5e robot is tasked to manipulate objects             and placing are done by moving the suction gripper directly
on a tabletop according to natural language instructions. The               on top of the desired positions, moving down until contact is
robot is equipped with a suction gripper, and it can only perform           detected, then either engages or disengages the suction cup.
pick and place actions parameterized by 2D top-down pick and              • say(message) - uses the robot speaker to voice out a message.
place positions. The robot is also expected to answer questions
                                                                          We demonstrate CaP on three domains in the tabletop
about the scene (e.g., how many blocks are there?) by using the
                                                                       manipulation setting. Instructions of each domain are listed below
provided perception APIs. In our demos, we use Google Cloud’s
                                                                       and were performed in a sequence. See full videos and generated
speech-to-text and text-to-speech APIs to allow users interact with
                                                                       code on the website.
the system through voice commands and also hear the robot’s
                                                                          Instructions for 4 blocks domain.
responses to commands and questions. Currently, the prompt only
supports having a set of unique objects. This is not a limitation of     1) Put the blocks in a horizontal line near the top
CaP but rather of the perception system - we do not have a good          2) Move the sky-colored block in between the red block and
way of persisting the identity of duplicate objects across VLM              the second block from the left
detections. A more sophisticated system of keeping track of the          3) Why did you move the green block?
perceived world state can resolve this issue.                            4) Which block did you move?
   Prompts.                                                              5) Arrange the blocks in a square around the middle
                                                                         6) Make the square bigger
   • tabletop_ui: the high-level
                                                                         7) Undo that
      UI for parsing user commands and calling other functions
                                                                         8) rotate the square by 45 degrees
      https://code-as-policies.github.io/prompts/tabletop_ui.txt
                                                                         9) Can you throw blocks?
   • parse_obj_name:
                                                                        10) Move the red block 5cm to the bottom
      return names of objects from natural language descriptions
                                                                        11) Do the same with the other blocks
      https://code-
                                                                        12) Put the blocks on different corners clockwise starting at the
      as-policies.github.io/prompts/parse_obj_name.txt
                                                                            top right corner
   • parse_position:
      return a 2D position from natural language descriptions             Instructions for 3 blocks and 3 bowls domain.
      https://code-as-policies.github.io/prompts/parse_position.txt      1) Put the red block to the left of the rightmost bowl
   • parse_question: return a response (could be a number,               2) Now move it to the side farthest away from it
      a boolean, or a string) to a natural language question             3) How many bowls are to the left of the red block?
      https://code-                                                      4) place the blocks in bowls with non matching colors
      as-policies.github.io/prompts/parse_question.txt                   5) put the blocks in a vertical line 20 cm long and 10 cm below
   • function_generation: define functions from comments                    the blue bowl
      https://code-as-policies.github.io/prompts/fgen.txt                6) imagine that the bowls represent a volcano, a forest, and an
   APIs.                                                                    ocean
   • get_obj_names() - gets list of available objects in the scene.
                                                                         7) also imagine that the blocks are parts of a building
      these are prespecified.                                            8) now build a tower in the forest
   • get_obj_pos(name) - gets the 2D position of the center of
                                                                         9) show me what happens when a volcano erupts over the ocean
      an object by name.                                                  Instructions for fruits, bottles, and plates domain.
   • is_obj_visible(name) - checks if an object is visible by            1) How many fruits are there?
      name.                                                              2) Tell me their names
   • get_bbox(name) - gets the 2D axis-aligned bounding box              3) Are there any fruits on the green plate?
      of an object by name. This is in robot base coordinates, not       4) Move all fruits to the green plate and bottles to the blue plate
      in pixels.                                                         5) Move the smallest fruit back to the yellow plate
   • get_segmask(name) - gets the segmentation mask of an                6) Wait until you see an egg and put it on the green plate
      object detection by name. This is in pixels.                       7) Put the darkest object in the plate that has the apple
J. Mobile Robot                                                                     • goto_pos(pos_3d) - navigates to a 3D position by running

   The mobile manipulation experiment is set up with robots from                        the robot’s internal motion planner.
Everyday Robots navigating and interacting with objects in a real                   • goto_loc(name)       - navigates to a location by name by
world office kitchen. The robot has a mobile base and a 7DoF                            running the robot’s internal motion planner.
arm. For implementing the perception APIs, we mainly use the                        • pick_obj(name) - picks up an object by its name. The object

RGBD camera sensor on the robot. The robot is shown in Fig. 6.                          must be currently visible. This is implemented as a scripted
                                                                                        picking primitive using ViLD object detections.
                                                                                    • place_at_pos(pos_3d) - places the currently held object at
                                                                                        a position.
                                                                                    • place_at_obj(name) - places the currently held object on
                                                                                        top of another object by name.
                                                                                    • say(message) - uses the robot’s speaker to voice out a
                               RGBD image, 640 x 512                                    message.
                                                                                    Below we list commands that were performed on the mobile
                                                                                 robot platform. The first are navgiation-related tasks, while the
                                                                                 second are manipulation related. For the latter manipulation
                                                                                 commands, note the ability of CaP to form "short-term memory"
                                                                                 by explicitly record variables (in this case, the robot’s past
                                       Frontal view,                             positions) in the Python execution scope and referring back them
                                   Pre-manipulation pose
                                                                                 later. See videos and generated code on the website.
Fig. 6: Experiment Setup for mobile manipulation with a Everyday Robots robot.
                                                                                    Mobile Navigation Instructions.
                                                                                   1) Moving in a 3m by 2m rectangle around the office chair
   Prompts.                                                                        2) Do that again but rotated 45 degrees clockwise
   • mobile_ui: the high-level                                                     3) Go in a 1.5m square around the barstool as many times
     UI for parsing user commands and calling other functions                           as needed, check each step if there is a banana, only stop
     https://code-as-policies.github.io/prompts/mobile_ui.txt                           moving when you see the banana
   • parse_obj_name:                                                               4) Follow the convex hull containing the chairs
     return names of objects from natural language descriptions                    5) Move back and forth between the table and the countertop
     https://code-                                                                      3 times
     as-policies.github.io/prompts/mobile_parse_obj_name.txt                        Mobile Manipulation Instructions.
   • parse_position:                                                               1) How many snacks are on the table?
     return a 2D position from natural language descriptions                       2) Take the water bottle from the desk and put it in the middle
     https://code-                                                                      of the fruits on the table
     as-policies.github.io/prompts/mobile_parse_pos.txt                            3) This is the compost bin
   • transform_traj: performs 2D transforms on                                     4) This is the recycle bin
     a sequence of 2D points from natural language descriptions                    5) This is the landfill bin
     https://code-                                                                 6) The coke can and the apple are on the table
     as-policies.github.io/prompts/mobile_transform_traj.txt                       7) Put way the coke can and the apple on their corresponding
   • function_generation: define functions from comments                                bins
     https://code-as-policies.github.io/prompts/fgen_simple.txt
   APIs.                                                                         K. Simulation Tabletop Manipulation Evaluations
   • get_obj_names() - gets list of available objects in the scene.                 Similar to the real-world tabletop domain, we construct a
     these are prespecified.                                                     simulated tabletop environment, in which a UR5e robot equipped
   • get_obj_pos(name) - get the 2D position of the center of an                 with a Robotiq 2F85 jaw gripper is given natural language
     object by name.                                                             instructions to complete rearrangement tasks. The objects include
   • is_obj_visible(name) - returns whether or not the robot                     10 different colored blocks and 10 different colored bowls. The
     sees an object by name.                                                     proposed CaP is given APIs for accessing a list of present objects
   • get_visible_obj_names() - returns a list of currently visible               and their locations, via a scripted object detector, as well as a
     object names.                                                               pick-and-place motion primitive that are parameterized by either
   • get_loc_names() - returns a list of all predefined location                 coordinates or object names.
     names the robot can navigate to.                                               Prompts.
   • get_obj_pos(name) - gets the 3D location of an object by                       • tabletop_ui: the high-level
     name. This object must be currently visible.                                      UI for parsing user commands and calling other functions
   • get_loc_pos(name) - gets the 2D location and 1D angle of                          https://code-
     a predefined location.                                                            as-policies.github.io/prompts/sim_tabletop_ui.txt
   • get_robot_pos_and_angle - gets the current 3D robot
     position and 1D angle (heading).
   • parse_obj_name:                                                      5) Pick up the <block1> and place it in the corner <distance>
      return names of objects from natural language descriptions              to the <bowl>
      https://code-                                                       6) Put all the blocks in a <line> line
      as-policies.github.io/prompts/sim_parse_obj_name.txt                 Seen Attributes.
   • parse_position:
                                                                          1) <block>: blue block, red block, green block, orange block,
      return a 2D position from natural language descriptions                 yellow block
      https://code-                                                       2) <bowl>: blue bowl, red bowl, green bowl, orange bowl,
      as-policies.github.io/prompts/sim_parse_position.txt                    yellow bowl
   • function_generation: define functions from comments
                                                                          3) <corner/side>: left side, top left corner, top side, top right
      https://code-as-policies.github.io/prompts/fgen.txt                     corner
   APIs.                                                                  4) <direction>: top, left
   • get_obj_names() - gets list of available objects in the scene.       5) <distance>: closest
      these are prespecified.                                             6) <magnititude>: a little
   • get_obj_pos(name) - gets the 2D position of the center of            7) <nth>: first, second
      an object by name.                                                  8) <line>: horizontal, vertical
   • denormalize_xy(normalized_pos_2d)             - converts a            Unseen Attributes.
      normalized 2D coordinate (each value between 0                      1) <block>: pink block, cyan block, brown block, gray block,
      and 1) to an actual 2D coordinate in robot frame.                       purple block
   • put_first_on_second(obj_name, target) - picks the first
                                                                          2) <bowl>: pink bowl, cyan bowl, brown bowl, gray bowl,
      object by name and places it on top of the target by name. The          purple bowl
      target could be another object name or a 2D position. Picking       3) <corner/side>: bottom right corner, bottom side, bottom left
      and placing are done by moving the suction gripper directly             corner
      on top of the desired positions, moving down until contact is       4) <direction>: bottom, right
      detected, then either engages or disengages the suction cup.        5) <distance>: farthest
   We evaluate CaP and the baselines on the following tasks,              6) <magnititude>: a lot
where each task refers to a unique instruction template (e.g.,            7) <nth>: third, fourth
“Pick up the <block> and place it in the corner <distance> to             8) <line>: diagonal
the <bowl>”) that are parameterized by certain attributes (e.g.,           In Table VI we provide detailed simulation results that report
<block>). We split the tasks into the instructions and the attributes   task success rats for fine-grained task categories. Attributes refer
to “seen” and “unseen” categories, where the “seen” instructions        to <> fields, the values of which can be seen by the method (e.g.,
or attributes are permitted to appear in the prompt or used for         training set for CLIPort, prompt for language-based methods).
training (in the case of supervised baselines). Full list can be        Instructions refer to the templated instruction type given in each
found below. Note that we further group the instructions into           row, which can also be seen or unseen. A total of 50 trials are
“Long-Horizon” and “Spatial-Geometric” task families. The               performed per task, each with sampled attributes and initial scene
“Long-Horizon” instructions are 1-5 in Seen Instructions and 1-3        configurations (block and bowl types, numbers, and positions).
in Unseen Instructions. The “Spatial-Geometric” instructions are        Note that CLIPort by itself (no oracle) is just a feedback policy
5-8 in Seen Instructions and 4-6 in Unseen Instructions.                and it does not know when to stop — in this case we run 10
   Seen Instructions.                                                   actions from the CLIPort policy and evaluate success at the end.
  1) Pick up the <block1> and place it on the (<block2> or              To improve CLIPort performance, we use a variant that uses
      <bowl>)                                                           oracle information from the simulation to stop the policy when
  2) Stack all the blocks                                               success is detected (oracle termination).
  3) Put all the blocks on the <corner/side>
  4) Put the blocks in the <bowl>                                       L. Additional LLM Capabilities
  5) Put all the blocks in the bowls with matching colors                 Using a large pretrained LLM also means we can leverage its
  6) Pick up the block to the <direction> of the <bowl> and place       capabilities beyond code-writing. For example, Code as Policies
      it on the <corner/side>                                           can parse commands from non-English languages as well as
  7) Pick up the block <distance> to the <bowl> and place it on         emojis. See Figure 7.
      the <corner/side>
                                                                        M. Cross Embodiment Example
  8) Pick up the <nth> block from the <direction> and place it
      on the <corner/side>                                                 CaP exhibit a degree of cross-embodiment support [59], [60]
   Unseen Instructions.                                                 by performing the same task differently depending on the action
                                                                        APIs. In the example below, we give Hints of the action APIs, and
  1) Put all the blocks in different corners
                                                                        the resultant plan changes depending on the whether or not the
  2) Put the blocks in the bowls with mismatched colors
                                                                        robot is omnidirectional or unidirectional. We note that this ability
  3) Stack all the blocks on the <corner/side>
                                                                        is brittle with existing LLMs and cannot reliably adapt to APIs
  4) Pick up the <block1> and place it <magnitude> to the
                                                                        that are very different. More robustness may require larger ones
      <direction> of the <bowl>
                                                                        trained on domain-specific code.
                                TABLE VI: Detailed simulation tabletop manipulation success rate (%) across different task scenarios.

                                                                                   CLIPort (oracle termination)   CLIPort (no oracle)   NL Planner     CaP (ours)
 Seen Attributes, Seen Instructions
 Pick up the <object1> and place it on the (<object2> or <recepticle-bowl>)                    88                         44                98            100
 Stack all the blocks                                                                           98                         4                 94            94
 Put all the blocks on the <corner/side>                                                        96                         8                 46            92
 Put the blocks in the <recepticle-bowl>                                                       100                        22                 94           100
 Put all the blocks in the bowls with matching colors                                          12                         14                100           100
 Pick up the block to the <direction> of the <recepticle-bowl> and place it on                 100                        80                N/A           72
 the <corner/side>
 Pick up the block <distance> to the <recepticle-bowl> and place it on the                     92                         54                N/A            98
 <corner/side>
 Pick up the <nth> block from the <direction> and place it on the <cor-                        100                        38                N/A            98
 ner/side>
 Total                                                                                         85.8                      33.0               86.4          94.3
 Long-Horizon Total                                                                            78.8                      18.4               86.4          97.2
 Spatial-Geometric Total                                                                       97.3                      57.3               N/A           89.3
 Unseen Attributes, Seen Instructions
 Pick up the <object1> and place it on the (<object2> or <recepticle-bowl>)                    12                         10                98            100
 Stack all the blocks                                                                          96                         8                 96            100
 Put all the blocks on the <corner/side>                                                        0                         0                 58            100
 Put the blocks in the <recepticle-bowl>                                                       46                         0                 88             96
 Put all the blocks in the bowls with matching colors                                          30                         26                100            92
 Pick up the block to the <direction> of the <recepticle-bowl> and place it on                  0                         0                 N/A            60
 the <corner/side>
 Pick up the block <distance> to the <recepticle-bowl> and place it on the                      0                          0                N/A           100
 <corner/side>
 Pick up the <nth> block from the <direction> and place it on the <cor-                         0                          0                N/A            60
 ner/side>
 Total                                                                                         23.0                       5.5               88.0          88.5
 Long-Horizon Total                                                                            36.8                       8.8               88.0          97.6
 Spatial-Geometric total                                                                        0.0                       0.0               N/A           73.3
 Unseen Attributes, Unseen Instructions
 Put all the blocks in different corners                                                        0                          0                60             98
 Put the blocks in the bowls with mismatched colors                                             0                          0                92             60
 Stack all the blocks on the <corner/side>                                                      0                          0                40             82
 Pick up the <object1> and place it <magnitude> to the <direction> of the                       0                          0                N/A            38
 <recepticle-bowl>
 Pick up the <object1> and place it in the corner <distance> to the <recepticle-                4                          0                N/A            58
 bowl>
 Put all the blocks in a <line>                                                                 0                          0                N/A            90
 Total                                                                                         0.7                        0.0               64.0          71.0
 Long-Horizon Total                                                                            0.0                        0.0               64.0          80.0
 Spatial-Geometric Total                                                                       1.3                        0.0               N/A           62.0



                                                                                         # omnidirectional robot.
                                                                                         # available actions: move_up(dist), move_right(dist), move_back(dist).
                                                                                         # make a U shape 5 meters wide and 10 meters long.
                                                                                         robot.move_back(dist=10)
                                                                                         robot.move_right(dist=5)
                                                                                         robot.move_up(dist=10)
                                                                                         # unidirectional robot.
                                                                                         # available actions: turn_left(deg), move_forward(dist).
                                                                                         # make a U shape 3 meters wide and 8 meters long.
                                                                                         robot.move_forward(dist=8)
                                                                                         robot.turn_left(deg=90)
                                                                                         robot.move_forward(dist=3)
                                                                                         robot.turn_left(deg=90)
                                                                                         robot.move_forward(dist=8)




Fig. 7: LMPs inherit benefits of LLMs, such as parsing commands from non-
English languages and emojis.
